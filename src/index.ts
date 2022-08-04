import type {
    CreateParams,
    CreateResult,
    DataProvider,
    DeleteManyParams,
    DeleteManyResult,
    DeleteParams,
    DeleteResult,
    GetListParams,
    GetListResult,
    GetManyParams,
    GetManyReferenceParams,
    GetManyReferenceResult,
    GetManyResult,
    GetOneParams,
    GetOneResult,
    RaRecord,
    UpdateManyParams,
    UpdateManyResult,
    UpdateParams,
    UpdateResult
} from "ra-core";

import {
    fetchUtils
} from "ra-core";

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
 * append the result directly to the request url
 */
export const formatFilter = (filter: Record<string, any>): string => {
    return Object.entries(filter)
        .map(([key, value], _index) => {
            let operator: FilterOperator = "eq";
            const suffix = key.slice(-2);
            if (key.slice(-3, -2) === "_" && isValidFilterOperator(suffix)) {
                operator = suffix;
                return [key.slice(0, -3), operator, formatFilterArguments(operator, value)].filter(v => !!v).join(",");
            }

            return `${key},eq,${value}`;
        })
        .join("&filter=");
};

const formatFilterArguments = (operator: FilterOperator, value: any): string => {
    switch (operator) {
        case "bt":
            if (!Array.isArray(value)) { throw new TypeError("Array expected as filter value for filter type \"between\" (bt)") }
            return `${value[0]},${value[1]}`;

        case "in":
            if (!Array.isArray(value)) { throw new TypeError("Array expected as filter value for filter type \"in\"") }
            return value.join(",");

        case "is":
            return null; // is null filter doesn't require any arguments

        default:
            return value;
    }
}

/** see https://github.com/mevdschee/php-crud-api#filters */
const filterOperators = [
    "cs", // contain string (string contains value)
    "sw", // start with (string starts with value)
    "ew", // end with (string end with value)
    "eq", // equal (string or number matches exactly)
    "lt", // lower than (number is lower than value)
    "le", // lower or equal (number is lower than or equal to value)
    "ge", // greater or equal (number is higher than or equal to value)
    "gt", // greater than (number is higher than value)
    "bt", // between (number is between two comma separated values)
    "in", // in (number or string is in comma separated list of values)
    "is", // is null (field contains "NULL" value)
] as const;

type FilterOperator = typeof filterOperators[number];

const isValidFilterOperator = (value: any): value is FilterOperator => filterOperators.includes(value);

const formatParams = (rawParams?: Record<string, string>): string => decodeURIComponent(new URLSearchParams(rawParams).toString());

export class TreeQLDataProvider<ResourceType extends string = string> implements DataProvider<ResourceType> {

    private apiUrl: string;
    public constructor(_apiUrl: ResourceType, private httpClient = fetchUtils.fetchJson) {
        this.apiUrl = _apiUrl.endsWith("/") ? _apiUrl.slice(0, -1) : _apiUrl;
    }

    public async getList<RecordType extends RaRecord = any>(resource: ResourceType, params: GetListParams): Promise<GetListResult<RecordType>> {
        const { sort, pagination, filter } = params;
        const { page, perPage } = pagination;
        const { field, order } = sort;
        const url = this.getURL(resource, {
            order: `${field},${order}`,
            page: `${page},${perPage}`,
            filter: formatFilter(filter)
        });

        const { json: { records, results } } = await this.httpClient(url);
        return ({
            data: records,
            total: results,
        });
    }

    public async getOne<RecordType extends RaRecord = any>(resource: ResourceType, params: GetOneParams<RecordType>): Promise<GetOneResult<RecordType>> {
        const { json } = await this.httpClient(`${this.getURL(resource)}/${params.id}`);
        return ({ data: json });
    }

    public async getMany<RecordType extends RaRecord = any>(resource: ResourceType, params: GetManyParams): Promise<GetManyResult<RecordType>> {
        const url = `${this.getURL(resource)}/${params.ids.join(',')}`;
        const { json } = await this.httpClient(url);
        return ({ data: Array.isArray(json) ? json : [json] });
    }

    public async getManyReference<RecordType extends RaRecord = any>(resource: ResourceType, params: GetManyReferenceParams): Promise<GetManyReferenceResult<RecordType>> {
        const { id, target, sort, pagination, filter } = params;
        const { page, perPage } = pagination;
        const { field, order } = sort;
        const url = this.getURL(resource, {
            order: `${field},${order}`,
            page: `${page},${perPage}`,
            filter: formatFilter({
                ...filter,
                [target]: id
            })
        });

        const { json: { records, results } } = await this.httpClient(url);
        return ({
            data: records,
            total: results,
        });
    }

    public async update<RecordType extends RaRecord = any>(resource: ResourceType, params: UpdateParams<RecordType>): Promise<UpdateResult<RecordType>> {
        const { id, data, previousData } = params
        await this.httpClient(`${this.getURL(resource)}/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
        return {
            data: {
                ...previousData,
                ...data
            }
        };
    }

    public async updateMany<RecordType extends RaRecord = any>(resource: ResourceType, params: UpdateManyParams): Promise<UpdateManyResult<RecordType>> {
        const { ids, data } = params;
        await this.httpClient(`${this.getURL(resource)}/${ids.join(',')}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
        // TODO: there's no previous data for updateMany... do we need to return complete records?
        return { data: ids };
    }

    public async create<RecordType extends RaRecord = any>(resource: ResourceType, params: CreateParams): Promise<CreateResult<RecordType>> {
        const { data } = params;
        const { json } = await this.httpClient(`${this.getURL(resource)}`, {
            method: 'POST',
            body: JSON.stringify(data),
        });
        return ({
            data: { ...data, id: json },
        });
    }

    public async delete<RecordType extends RaRecord = any>(resource: ResourceType, params: DeleteParams<RecordType>): Promise<DeleteResult<RecordType>> {
        const { id, previousData } = params
        await this.httpClient(`${this.getURL(resource)}/${id}`, {
            method: 'DELETE',
        });
        return ({ data: previousData });
    }

    public async deleteMany<RecordType extends RaRecord = any>(resource: ResourceType, params: DeleteManyParams<RecordType>): Promise<DeleteManyResult<RecordType>> {
        const { ids } = params;
        await this.httpClient(`${this.getURL(resource)}/${ids.join(',')}`, {
            method: 'DELETE',
        });
        return ({ data: ids });
    }

    protected getURL(resource: string, _params?: Record<string, string>) {
        const params = (_params && Object.keys(_params).length > 0) ? `?${formatParams(_params)}` : "";
        return `${this.apiUrl}/records/${resource}${params}`;
    }
}

const getDataProvider = (apiUrl: string, httpClient?: typeof fetchUtils.fetchJson) => new TreeQLDataProvider(apiUrl, httpClient);

export default getDataProvider;
