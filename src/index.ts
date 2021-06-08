import { stringify } from 'query-string';
import { DataProvider, fetchUtils } from 'ra-core';

/**
 * Maps react-admin queries to a TreeQL powered REST API
 *
 * @see https://treeql.org
 *
 * @example
 *
 * getList          => GET http://my.api.url/records/posts?order=title,ASC&page=1,25
 * getOne           => GET http://my.api.url/records/posts/123
 * getMany          => GET http://my.api.url/records/posts?123,456,789
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

/**
 * include this object in the query object
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const formatFilterOR = (filter: { [key: string]: any }): { [key: string]: string } => {
    return Object.entries(filter)
        .map(([key, value], index) => {
            return { [`filter${index}`]: `${key},eq,${value}` };
        })
        .reduce((prev, current) => ({ ...prev, ...current }), {});
};

/**
 * append the result directly to the request url
 */
const formatFilterAND = (filter: { [key: string]: any }): string => {
    return Object.entries(filter)
        .map(([key, value], _index) => {
            return `filter=${key},eq,${value}`;
        })
        .join("&");
};

const getDataProvider = (apiUrl: string, httpClient = fetchUtils.fetchJson): DataProvider => ({
    getList: async (resource, params) => {
        const { page, perPage } = params.pagination;
        const { field, order } = params.sort;
        const query = {
            order: `${field},${order}`,
            page: `${page},${perPage}`
        };
        const url = `${apiUrl}/records/${resource}?${stringify(query)}&${formatFilterAND(params.filter)}`;

        const { json } = await httpClient(url);
        return ({
            data: json.records,
            total: json.results ?? 0,
        });
    },

    getOne: async (resource, params) => {
        const { json } = await httpClient(`${apiUrl}/records/${resource}/${params.id}`);
        return ({ data: json });
    },

    getMany: async (resource, params) => {
        const url = `${apiUrl}/records/${resource}/${params.ids.join(',')}`;
        const { json } = await httpClient(url);
        return ({ data: Array.isArray(json) ? json : [json] });
    },

    // TODO: filter is not well-formed
    getManyReference: async (resource, params) => {
        const { page, perPage } = params.pagination;
        const { field, order } = params.sort;
        const query = {
            order: `${field},${order}`,
            page: `${page},${perPage}`,
        };
        const url = `${apiUrl}/records/${resource}?${stringify(query)}&${formatFilterAND(params.filter)}`;

        const { json } = await httpClient(url);
        return ({
            data: json.records,
            total: json.results,
        });
    },

    // TODO: update is not returning the record
    update: async (resource, params) => {
        await httpClient(`${apiUrl}/records/${resource}/${params.id}`, {
            method: 'PUT',
            body: JSON.stringify(params.data),
        });
        const { json } = await httpClient(`${apiUrl}/records/${resource}/${params.id}`);
        return ({
            data: json,
        });
    },

    // TODO: updateMany is not returning the records
    updateMany: async (resource, params) => {
        const { json } = await httpClient(`${apiUrl}/records/${resource}/${params.ids.join(',')}`, {
            method: 'PUT',
            body: JSON.stringify(params.data),
        });
        return ({ data: json });
    },

    create: async (resource, params) => {
        const { json } = await httpClient(`${apiUrl}/records/${resource}`, {
            method: 'POST',
            body: JSON.stringify(params.data),
        });
        return ({
            data: { ...params.data, id: json },
        });
    },

    // TODO: delete is not returning the id
    delete: async (resource, params) => {
        const { json } = await httpClient(`${apiUrl}/records/${resource}/${params.id}`, {
            method: 'DELETE',
        });
        return ({ data: json });
    },

    deleteMany: async (resource, params) => {
        const { json } = await httpClient(`${apiUrl}/records/${resource}/${params.ids.join(',')}`, {
            method: 'DELETE',
        });
        return ({ data: Array.isArray(json) ? json : [json] });
    },
});

export default getDataProvider;
