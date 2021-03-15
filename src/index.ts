import { stringify } from 'query-string';
import { fetchUtils, DataProvider } from 'ra-core';

/**
 * Maps react-admin queries to a TreeQL powered REST API
 *
 * @see https://treeql.org
 *
 * @example
 *
 * getList          => GET http://my.api.url/records/posts?order=title,ASC&page=1,25
 * getOne           => GET http://my.api.url/records/posts/123
 * getMany          => GET http://my.api.url/records/posts?id=123,456,789
 * getManyReference => GET http://my.api.url/records/posts?filter=author_id,eq,345
 * update           => PUT http://my.api.url/records/posts/123
 * updateMany       => PUT http://my.api.url/records/posts/123,456,789
 * create           => POST http://my.api.url/records/posts/123
 * delete           => DELETE http://my.api.url/records/posts/123
 * deleteMany       => DELETE http://my.api.url/records/posts/123,456,789
 * 
 * @example
 *
 * import * as React from "react";
 * import { Admin, Resource } from 'react-admin';
 * import treeqlProvider from 'ra-data-treeql';
 *
 * import { PostList } from './posts';
 *
 * const App = () => (
 *     <Admin dataProvider={treeqlProvider('http://my.api.url/')}>
 *         <Resource name="posts" list={PostList} />
 *     </Admin>
 * );
 *
 * export default App;
 */
export default (apiUrl, httpClient = fetchUtils.fetchJson): DataProvider => ({
    getList: (resource, params) => {
        const { page, perPage } = params.pagination;
        const { field, order } = params.sort;
        const query = {
            ...fetchUtils.flattenObject(params.filter),
            order: `${field},${order}`,
            page: `${page},${perPage}`,
        };
        const url = `${apiUrl}/records/${resource}?${stringify(query)}`;

        return httpClient(url).then(({ json }) => ({
            data: json.records,
            total: json.results,
        }));
    },

    getOne: (resource, params) => {
        return httpClient(`${apiUrl}/records/${resource}/${params.id}`).then(({ json }) => ({
            data: json,
        }));
    },

    getMany: (resource, params) => {
        const url = `${apiUrl}/records/${resource}/${params.ids.join(',')}`;
        return httpClient(url).then(({ json }) => ({ data: json }));
    },

    // TODO: filter is not well-formed
    getManyReference: (resource, params) => {
        const { page, perPage } = params.pagination;
        const { field, order } = params.sort;
        const query = {
            filter: fetchUtils.flattenObject(params.filter),
            order: `${field},${order}`,
            page: `${page},${perPage}`,
        };
        const url = `${apiUrl}/records/${resource}?${stringify(query)}`;

        return httpClient(url).then(({ json }) => ({
            data: json.records,
            total: json.results,
        }));
    },

    // TODO: update is not returning the record
    update: (resource, params) => {
        return httpClient(`${apiUrl}/records/${resource}/${params.id}`, {
            method: 'PUT',
            body: JSON.stringify(params.data),
        }).then(({ json }) => ({ data: json }));
    },

    // TODO: updateMany is not returning the records
    updateMany: (resource, params) => {
        return httpClient(`${apiUrl}/records/${resource}/${params.ids.join(',')}`, {
            method: 'PUT',
            body: JSON.stringify(params.data),
        }).then(({ json }) => ({ data: json }));
    },

    create: (resource, params) => {
        return httpClient(`${apiUrl}/records/${resource}`, {
            method: 'POST',
            body: JSON.stringify(params.data),
        }).then(({ json }) => ({
            data: { ...params.data, id: json },
        }));
    },

    // TODO: delete is not returning the id
    delete: (resource, params) => {
        return httpClient(`${apiUrl}/records/${resource}/${params.id}`, {
            method: 'DELETE',
        }).then(({ json }) => ({ data: json }));
    },

    // TODO: deleteMany is not returning the ids
    deleteMany: (resource, params) => {
        return httpClient(`${apiUrl}/records/${resource}/${params.ids.join(',')}`, {
            method: 'DELETE',
        }).then(({ json }) => ({ data: json }));
    },
});
