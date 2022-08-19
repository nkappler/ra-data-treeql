# TreeQL Data Provider For React-Admin

[![coverage](https://img.shields.io/badge/coverage-100%25-brightgreen)](https://nkappler.github.io/ra-data-treeql/coverage/lcov-report/)
[![npm](https://img.shields.io/npm/v/ra-data-treeql.svg)](https://www.npmjs.com/package/ra-data-treeql) [![types](https://img.shields.io/npm/types/ra-data-treeql.svg)](https://unpkg.com/browse/ra-data-treeql@1.1.0/dist/index.d.ts)

TreeQL Data Provider for [react-admin](https://github.com/marmelab/react-admin), the frontend framework for building admin applications on top of REST/GraphQL services.

[![react-admin-demo](https://marmelab.com/react-admin/img/react-admin-demo-still.png)](https://vimeo.com/268958716)

## Installation

```sh
npm install --save ra-data-treeql
```

## REST Dialect

This Data Provider fits REST APIs following the [TreeQL](https://treeql.org) specification, such as [PHP-CRUD-API](https://github.com/mevdschee/php-crud-api) powered APIs.

| Method             | API calls                                                         |
| ------------------ | ----------------------------------------------------------------- |
| `getList`          | `GET http://my.api.url/records/posts?order=title,ASC&page=1,25`   |
| `getOne`           | `GET http://my.api.url/records/posts/123`                         |
| `getMany`          | `GET http://my.api.url/records/posts?123,456,789`              |
| `getManyReference` | `GET http://my.api.url/records/posts?filter=author_id,eq,345`     |
| `update`           | `PUT http://my.api.url/records/posts/123`                         |
| `updateMany`       | `PUT http://my.api.url/records/posts/123,456,789`                 |
| `create`           | `POST http://my.api.url/records/posts/123`                        |
| `delete`           | `DELETE http://my.api.url/records/posts/123`                      |
| `deleteMany`       | `DELETE http://my.api.url/records/posts/123,456,789`              |

## Usage

```jsx
// in src/App.js
import * as React from "react";
import { Admin, Resource } from 'react-admin';
import treeqlProvider from 'ra-data-treeql';

import { PostList } from './posts';

const App = () => (
    <Admin dataProvider={treeqlProvider('http://my.api.url/')}>
        <Resource name="posts" list={PostList} />
    </Admin>
);

export default App;
```
### Filter Operators
The following filter operators are supported. All operators except the search operator `q` can be negated by prepending `n` so for example `cs` becomes `ncs`.

|Operator|Description|
|-|-|
|`q` |search all fields|
|`cs`|contains string|
|`sw`|starts with|
|`ew`|ends with|
|`eq`<br />&nbsp;|equal<br /><small><i>Default when no operator is provided</i></small>|
|`lt`|less than|
|`le`|less or equal|
|`ge`|greater or equal|
|`gt`|greater than|
|`bt`|between|
|`in`|in list|
|`is`|is `null`|

To use a filter operator, append it as a suffix to the `source` attribute for the field you want to apply the filter for:<br />
<small><i>The search operator `q` isn't a suffix, use it as the `source` attribute</i></small>

```jsx
import { Datagrid, List, TextField, TextInput } from "react-admin";

const filters = [
    <TextInput label="Search" source="q" alwaysOn />,
    <TextInput label="First Name" source="firstname_cs" />,
];

export const CustomerList = () => (
    <List {...{ filters }}>
        <Datagrid>
            <TextField source="firstname" />
            <TextField source="lastname" />
        </Datagrid>
    </List>
);
```

### Adding Custom Headers

The provider function accepts an HTTP client function as second argument. By default, they use react-admin's `fetchUtils.fetchJson()` as HTTP client. It's similar to HTML5 `fetch()`, except it handles JSON decoding and HTTP error codes automatically.

That means that if you need to add custom headers to your requests, you just need to *wrap* the `fetchJson()` call inside your own function:

```jsx
import { fetchUtils, Admin, Resource } from 'react-admin';
import treeqlProvider from 'ra-data-treeql';

const httpClient = (url, options = {}) => {
    if (!options.headers) {
        options.headers = new Headers({ Accept: 'application/json' });
    }
    // add your own headers here
    options.headers.set('X-Custom-Header', 'foobar');
    return fetchUtils.fetchJson(url, options);
};
const dataProvider = treeqlProvider('http://my.api.url/', httpClient);

render(
    <Admin dataProvider={dataProvider} title="Example Admin">
       ...
    </Admin>,
    document.getElementById('root')
);
```

Now all the requests to the REST API will contain the `X-Custom-Header: foobar` header.

**Tip**: The most common usage of custom headers is for authentication. `fetchJson` has built-on support for the `Authorization` token header:

```js
const httpClient = (url, options = {}) => {
    options.user = {
        authenticated: true,
        token: 'SRTRDFVESGNJYTUKTYTHRG'
    };
    return fetchUtils.fetchJson(url, options);
};
```

Now all the requests to the REST API will contain the `Authorization: SRTRDFVESGNJYTUKTYTHRG` header.

## License

This data provider is licensed under the MIT License
