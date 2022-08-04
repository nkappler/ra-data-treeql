import {
    CreateParams,
    CreateResult,
    DataProvider,
    DeleteManyParams,
    DeleteManyResult,
    DeleteParams,
    DeleteResult,
    fetchUtils,
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
} from 'ra-core';

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
const formatFilterAND = (filter: Record<string, any>): string => {
    return Object.entries(filter)
        .map(([key, value], _index) => {
            let operator: FilterOperator = "eq";
            const suffix = key.slice(-2);
            if (key.slice(-3, -2) === "_" && isValidFilterOperator(suffix)) {
                operator = suffix;
                return [key.slice(0, -3), operator, formatFilterArguments(operator, value)].join(",");
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
            return ""; // is null filter doesn't require any arguments

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

const formatParams = (rawParams?: Record<string, string>): string => new URLSearchParams(rawParams).toString();

class TreeQLDataProvider<ResourceType extends string = string> implements DataProvider<ResourceType> {

    public constructor(private apiUrl: ResourceType, private httpClient = fetchUtils.fetchJson) { }

    public async getList<RecordType extends RaRecord = any>(resource: ResourceType, params: GetListParams): Promise<GetListResult<RecordType>> {
        const { page, perPage } = params.pagination;
        const { field, order } = params.sort;
        const url = this.getURL(resource, {
            order: `${field},${order}`,
            page: `${page},${perPage}`,
            filter: formatFilterAND(params.filter)
        });

        const { json: { records, results } } = await this.httpClient(url);
        return ({
            data: records,
            total: results ?? 0,
        });
    }

    public async getOne<RecordType extends RaRecord = any>(resource: ResourceType, params: GetOneParams): Promise<GetOneResult<RecordType>> {
        const { json } = await this.httpClient(`${this.getURL(resource)}/${params.id}`);
        return ({ data: json });
    }

    public async getMany<RecordType extends RaRecord = any>(resource: ResourceType, params: GetManyParams): Promise<GetManyResult<RecordType>> {
        const url = `${this.getURL(resource)}/${params.ids.join(',')}`;
        const { json } = await this.httpClient(url);
        return ({ data: Array.isArray(json) ? json : [json] });
    }

    public async getManyReference<RecordType extends RaRecord = any>(resource: ResourceType, params: GetManyReferenceParams): Promise<GetManyReferenceResult<RecordType>> {
        const { page, perPage } = params.pagination;
        const { field, order } = params.sort;
        const url = this.getURL(resource, {
            order: `${field},${order}`,
            page: `${page},${perPage}`,
            filter: formatFilterAND(params.filter)
        });

        const { json } = await this.httpClient(url);
        return ({
            data: json.records,
            total: json.results,
        });
    }

    public async update<RecordType extends RaRecord = any>(resource: ResourceType, params: UpdateParams): Promise<UpdateResult<RecordType>> {
        await this.httpClient(`${this.getURL(resource)}/${params.id}`, {
            method: 'PUT',
            body: JSON.stringify(params.data),
        });
        return this.getOne(resource, params);
    }

    public async updateMany<RecordType extends RaRecord = any>(resource: ResourceType, params: UpdateManyParams): Promise<UpdateManyResult<RecordType>> {
        await this.httpClient(`${this.getURL(resource)}/${params.ids.join(',')}`, {
            method: 'PUT',
            body: JSON.stringify(params.data),
        });
        return { data: params.ids };
    }

    public async create<RecordType extends RaRecord = any>(resource: ResourceType, params: CreateParams): Promise<CreateResult<RecordType>> {
        const { json } = await this.httpClient(`${this.getURL(resource)}`, {
            method: 'POST',
            body: JSON.stringify(params.data),
        });
        return ({
            data: { ...params.data, id: json },
        });
    }

    public async delete<RecordType extends RaRecord = any>(resource: ResourceType, params: DeleteParams): Promise<DeleteResult<RecordType>> {
        const { id } = params
        await this.httpClient(`${this.getURL(resource)}/${id}`, {
            method: 'DELETE',
        });
        return ({ data: { id } as RecordType });
    }

    public async deleteMany<RecordType extends RaRecord = any>(resource: ResourceType, params: DeleteManyParams): Promise<DeleteManyResult<RecordType>> {
        const { json } = await this.httpClient(`${this.getURL(resource)}/${params.ids.join(',')}`, {
            method: 'DELETE',
        });
        return ({ data: Array.isArray(json) ? json : [json] });
    }

    private getURL(resource: string, params?: Record<string, string>) {
        return `${this.apiUrl}/records/${resource}?${formatParams(params)}`;
    }
}

const getDataProvider = (apiUrl: string, httpClient?: typeof fetchUtils.fetchJson) => new TreeQLDataProvider(apiUrl, httpClient);

export default getDataProvider;
