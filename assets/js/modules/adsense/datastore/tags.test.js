/**
 * modules/adsense data store: tags tests.
 *
 * Site Kit by Google, Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * WordPress dependencies
 */
import apiFetch from '@wordpress/api-fetch';

/**
 * Internal dependencies
 */
import API from 'googlesitekit-api';
import { STORE_NAME } from './constants';
import {
	createTestRegistry,
	muteConsole,
	subscribeUntil,
	unsubscribeFromAll,
} from 'tests/js/utils';
import * as fixtures from './__fixtures__';

describe( 'modules/adsense tags', () => {
	let apiFetchSpy;
	let registry;
	let store;

	beforeAll( () => {
		API.setUsingCache( false );
	} );

	beforeEach( () => {
		registry = createTestRegistry();
		store = registry.stores[ STORE_NAME ].store;

		apiFetchSpy = jest.spyOn( { apiFetch }, 'apiFetch' );
	} );

	afterAll( () => {
		API.setUsingCache( true );
	} );

	afterEach( () => {
		unsubscribeFromAll( registry );
		apiFetchSpy.mockRestore();
	} );

	describe( 'actions', () => {

	} );

	describe( 'selectors', () => {
		describe( 'getTagPermission', () => {
			it( 'returns true if a user has access to this tag', async () => {
				fetch
					.doMockOnceIf(
						/^\/google-site-kit\/v1\/modules\/adsense\/data\/tag-permission/
					)
					.mockResponseOnce(
						JSON.stringify( fixtures.tagPermissionAccess ),
						{ status: 200 }
					);

				const clientID = fixtures.tagPermissionAccess.clientID;
				const accountID = fixtures.tagPermissionAccess.accountID;
				const permission = fixtures.tagPermissionAccess.permission;

				const initialSelect = registry.select( STORE_NAME ).getTagPermission( clientID );

				// The connection info will be its initial value while the connection
				// info is fetched.
				expect( initialSelect ).toEqual( undefined );
				await subscribeUntil( registry,
					() => (
						registry.select( STORE_NAME ).getTagPermission( clientID ) !== undefined
					),
				);

				const permissionForTag = registry.select( STORE_NAME ).getTagPermission( clientID );
				expect( fetch ).toHaveBeenCalledTimes( 1 );

				expect( permissionForTag ).toEqual( {
					accountID,
					permission,
				} );
			} );

			it( 'returns false if a user cannot access the requested tag', async () => {
				fetch
					.doMockOnceIf(
						/^\/google-site-kit\/v1\/modules\/adsense\/data\/tag-permission/
					)
					.mockResponseOnce(
						JSON.stringify( fixtures.tagPermissionNoAccess ),
						{ status: 200 }
					);

				const clientID = fixtures.tagPermissionNoAccess.clientID;
				const accountID = fixtures.tagPermissionNoAccess.accountID;
				const permission = fixtures.tagPermissionNoAccess.permission;

				const initialSelect = registry.select( STORE_NAME ).getTagPermission( clientID );
				// The connection info will be its initial value while the connection
				// info is fetched.
				expect( initialSelect ).toEqual( undefined );
				await subscribeUntil( registry,
					() => (
						registry.select( STORE_NAME ).getTagPermission( clientID ) !== undefined
					),
				);

				const permissionForTag = registry.select( STORE_NAME ).getTagPermission( clientID );
				expect( fetch ).toHaveBeenCalledTimes( 1 );

				expect( permissionForTag ).toEqual( {
					accountID,
					permission,
				} );
			} );

			it( 'dispatches an error if the request fails', async () => {
				const response = {
					code: 'internal_server_error',
					message: 'Internal server error',
					data: { status: 500 },
				};
				fetch
					.doMockIf(
						/^\/google-site-kit\/v1\/modules\/adsense\/data\/tag-permission/
					)
					.mockResponse(
						JSON.stringify( response ),
						{ status: 500 }
					);

				const clientID = fixtures.tagPermissionAccess.clientID;

				muteConsole( 'error' );
				registry.select( STORE_NAME ).getTagPermission( clientID );
				await subscribeUntil( registry,
					// TODO: We may want a selector for this, but for now this is fine
					// because it's internal-only.
					() => store.getState().isFetchingTagPermission[ clientID ] === false,
				);

				expect( fetch ).toHaveBeenCalledTimes( 1 );

				const permissionForTag = registry.select( STORE_NAME ).getTagPermission( clientID );
				expect( permissionForTag ).toEqual( undefined );
			} );
		} );

		describe( 'hasExistingTag', () => {
			it( 'returns true if an existing tag exists', async () => {
				registry.dispatch( STORE_NAME ).receiveExistingTag( 'ca-pub-12345678' );

				const hasExistingTag = registry.select( STORE_NAME ).hasExistingTag();

				await subscribeUntil( registry, () => registry
					.select( STORE_NAME )
					.hasFinishedResolution( 'getExistingTag' )
				);

				expect( hasExistingTag ).toEqual( true );
			} );

			it( 'returns false if no existing tag exists', async () => {
				registry.dispatch( STORE_NAME ).receiveExistingTag( null );

				const hasExistingTag = registry.select( STORE_NAME ).hasExistingTag();

				// Ensure the proper parameters were sent.
				await subscribeUntil( registry, () => registry
					.select( STORE_NAME )
					.hasFinishedResolution( 'getExistingTag' )
				);

				expect( hasExistingTag ).toEqual( false );
				expect( fetch ).not.toHaveBeenCalled();
			} );

			it( 'returns undefined if existing tag has not been loaded yet', async () => {
				const hasExistingTag = registry.select( STORE_NAME ).hasExistingTag();

				expect( hasExistingTag ).toEqual( undefined );

				await subscribeUntil( registry, () => registry
					.select( STORE_NAME )
					.hasFinishedResolution( 'getExistingTag' )
				);

				expect( fetch ).toHaveBeenCalledTimes( 1 );
			} );
		} );

		describe( 'hasTagPermission', () => {
			it( 'makes a request via the getTagPermission selector if no tag has been loaded ', async () => {
				fetch
					.doMockOnceIf(
						/^\/google-site-kit\/v1\/modules\/adsense\/data\/tag-permission/
					)
					.mockResponseOnce(
						JSON.stringify( fixtures.tagPermissionAccess ),
						{ status: 200 }
					);

				const { clientID } = fixtures.tagPermissionAccess;

				registry.select( STORE_NAME ).hasTagPermission( clientID );

				await subscribeUntil( registry,
					() => (
						registry.select( STORE_NAME ).getTagPermission( clientID ) !== undefined
					),
				);

				const hasPermission = registry.select( STORE_NAME ).hasTagPermission( clientID );

				expect( hasPermission ).toEqual( true );
				expect( fetch ).toHaveBeenCalledTimes( 1 );
			} );

			it( "returns true if this user has permission to access this client's tag", async () => {
				const { accountID, permission, clientID } = fixtures.tagPermissionAccess;

				registry.dispatch( STORE_NAME ).receiveTagPermission( {
					accountID,
					clientID,
					permission,
				} );

				const hasPermission = registry.select( STORE_NAME ).hasTagPermission( clientID );

				// Ensure the proper parameters were sent.
				await subscribeUntil( registry,
					() => (
						registry.select( STORE_NAME ).getTagPermission( clientID ) !== undefined
					),
				);

				expect( hasPermission ).toEqual( true );
				expect( fetch ).not.toHaveBeenCalled();
			} );

			it( 'returns false if no existing tag exists', async () => {
				const { accountID, permission, clientID } = fixtures.tagPermissionNoAccess;

				registry.dispatch( STORE_NAME ).receiveTagPermission( {
					accountID,
					clientID,
					permission,
				} );

				const hasPermission = registry.select( STORE_NAME ).hasTagPermission( clientID );

				// Ensure the proper parameters were sent.
				await subscribeUntil( registry,
					() => (
						registry.select( STORE_NAME ).getTagPermission( clientID ) !== undefined
					),
				);

				expect( hasPermission ).toEqual( false );
				expect( fetch ).not.toHaveBeenCalled();
			} );

			it( 'returns undefined if existing tag has not been loaded yet', async () => {
				muteConsole( 'error' );
				const hasPermission = registry.select( STORE_NAME ).hasTagPermission( fixtures.tagPermissionNoAccess.clientID );

				expect( hasPermission ).toEqual( undefined );
			} );
		} );

		describe( 'hasExistingTagPermission', () => {
			it( 'returns true if an existing tag exists and the user has permission for it', async () => {
				registry.dispatch( STORE_NAME ).receiveExistingTag( 'ca-pub-12345678' );
				registry.dispatch( STORE_NAME ).receiveTagPermission( {
					accountID: 'pub-12345678',
					clientID: 'ca-pub-12345678',
					permission: true,
				} );

				const hasPermission = registry.select( STORE_NAME ).hasExistingTagPermission();

				await subscribeUntil( registry, () => registry
					.select( STORE_NAME )
					.hasFinishedResolution( 'getExistingTag' )
				);

				expect( hasPermission ).toEqual( true );
			} );

			it( 'returns false if an existing tag exists and the user does not have permission for it', async () => {
				registry.dispatch( STORE_NAME ).receiveExistingTag( 'ca-pub-12345678' );
				registry.dispatch( STORE_NAME ).receiveTagPermission( {
					accountID: 'pub-12345678',
					clientID: 'ca-pub-12345678',
					permission: false,
				} );

				const hasPermission = registry.select( STORE_NAME ).hasExistingTagPermission();

				await subscribeUntil( registry, () => registry
					.select( STORE_NAME )
					.hasFinishedResolution( 'getExistingTag' )
				);

				expect( hasPermission ).toEqual( false );
			} );

			it( 'returns null if no existing tag exists', async () => {
				registry.dispatch( STORE_NAME ).receiveExistingTag( null );

				const hasPermission = registry.select( STORE_NAME ).hasExistingTagPermission();

				await subscribeUntil( registry, () => registry
					.select( STORE_NAME )
					.hasFinishedResolution( 'getExistingTag' )
				);

				expect( hasPermission ).toEqual( null );
				expect( fetch ).not.toHaveBeenCalled();
			} );
		} );
	} );
} );
