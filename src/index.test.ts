import { RaRecord } from "ra-core";
import getDataProvider, { formatParams, TreeQLDataProvider } from ".";

class TestDataProvider extends TreeQLDataProvider {
    public getURL = super.getURL;
}

const mockHTTP = {
    fetch: (_url: string, _options?) => Promise.resolve({ status: 200, headers: null as any, body: null, json: null })
};

const formatFilter = (filter: Record<string, any>) => formatParams({ filter } as any);

const dataProvider = new TestDataProvider("http://myApi.com/", (url, options) => mockHTTP.fetch(url, options));

const spyOn = jest.spyOn;

describe("getDataProvider", () => {
    it("default export should work", () => {
        expect(getDataProvider("http://myApi.com") instanceof TreeQLDataProvider).toBeTruthy();
    });
});

describe("formatFilter", () => {
    it("search param", () => expect(formatFilter({ q: "Hello", title: "World" })).toEqual("?search=Hello&filter=title,eq,World"));
    it("default", () => expect(formatFilter({ comment: 4 })).toEqual("?filter=comment,eq,4"));
    it("contains", () => expect(formatFilter({ comment_cs: 4 })).toEqual("?filter=comment,cs,4"));
    it("not contains", () => expect(formatFilter({ comment_ncs: 4 })).toEqual("?filter=comment,ncs,4"));
    it("start with", () => expect(formatFilter({ comment_sw: 4 })).toEqual("?filter=comment,sw,4"));
    it("start not with", () => expect(formatFilter({ comment_nsw: 4 })).toEqual("?filter=comment,nsw,4"));
    it("end with", () => expect(formatFilter({ comment_ew: 4 })).toEqual("?filter=comment,ew,4"));
    it("end not with", () => expect(formatFilter({ comment_new: 4 })).toEqual("?filter=comment,new,4"));
    it("lower than", () => expect(formatFilter({ comment_lt: 4 })).toEqual("?filter=comment,lt,4"));
    it("not lower than", () => expect(formatFilter({ comment_nlt: 4 })).toEqual("?filter=comment,nlt,4"));
    it("lower or equal", () => expect(formatFilter({ comment_le: 4 })).toEqual("?filter=comment,le,4"));
    it("not lower or equal", () => expect(formatFilter({ comment_nle: 4 })).toEqual("?filter=comment,nle,4"));
    it("greater or equal", () => expect(formatFilter({ comment_ge: 4 })).toEqual("?filter=comment,ge,4"));
    it("not greater or equal", () => expect(formatFilter({ comment_nge: 4 })).toEqual("?filter=comment,nge,4"));
    it("greater than", () => expect(formatFilter({ comment_gt: 4 })).toEqual("?filter=comment,gt,4"));
    it("not greater than", () => expect(formatFilter({ comment_ngt: 4 })).toEqual("?filter=comment,ngt,4"));
    it("between", () => expect(formatFilter({ comment_bt: [4, 8] })).toEqual("?filter=comment,bt,4,8"));
    it("not between", () => expect(formatFilter({ comment_nbt: [4, 8] })).toEqual("?filter=comment,nbt,4,8"));
    it("in", () => expect(formatFilter({ comment_in: [4, 8, 16, 32] })).toEqual("?filter=comment,in,4,8,16,32"));
    it("not in", () => expect(formatFilter({ comment_nin: [4, 8, 16, 32] })).toEqual("?filter=comment,nin,4,8,16,32"));
    it("is null", () => expect(formatFilter({ comment_is: 4 })).toEqual("?filter=comment,is"));
    it("is not null", () => expect(formatFilter({ comment_nis: 4 })).toEqual("?filter=comment,nis"));
    it("unsupported operator", () => expect(formatFilter({ comment_xy: 4 })).toEqual("?filter=comment_xy,eq,4"));
    it("unsupported negated operator", () => expect(formatFilter({ comment_nxy: 4 })).toEqual("?filter=comment_nxy,eq,4"));
    it("type errors", () => {
        try {
            formatFilter({ comment_bt: 4 });
        }
        catch (e) {
            expect(e instanceof TypeError).toBeTruthy();
            expect((e as TypeError).message).toEqual("Array expected as filter value for filter type \"between\" (bt)");
        }

        try {
            formatFilter({ comment_in: 4 });
        }
        catch (e) {
            expect(e instanceof TypeError).toBeTruthy();
            expect((e as TypeError).message).toEqual("Array expected as filter value for filter type \"in\"");
        }
    });
    it("ignore additional arguments", () => {
        expect(formatFilter({ comment_bt: [4, 8, 16, 32] })).toEqual("?filter=comment,bt,4,8");
        expect(formatFilter({ comment_is: 4 })).toEqual("?filter=comment,is");
    });
});

describe("getURL", () => {
    it("params should be encoded correctly", () => {
        const params = { order: "length,DESC", page: "1,25", filter: { id: 4 } };
        expect(dataProvider.getURL("comment", params)).toEqual("http://myApi.com/records/comment?order=length,DESC&page=1,25&filter=id,eq,4");
    });
});

describe("dataProvider API", () => {

    let mock: jest.SpyInstance;
    beforeEach(() => {
        mock = spyOn(mockHTTP, "fetch");
    });

    it("create", async () => {
        mock.mockImplementationOnce(() => ({ json: 1 }));
        // id shouldn't be required as it is usually generated on the server
        const result = await dataProvider.create("comment", { data: { title: "myComment", content: "This is a test comment" } });

        expect(mock).lastCalledWith(
            "http://myApi.com/records/comment",
            {
                body: JSON.stringify({ title: "myComment", "content": "This is a test comment" }),
                method: "POST"
            }
        );

        expect(result).toEqual({
            data: {
                title: "myComment",
                content: "This is a test comment",
                id: 1
            },
        });
    });

    it("delete", async () => {
        const result = await dataProvider.delete("comment", { id: 1, previousData: { id: 1, title: "myComment", content: "This is a test comment" } });

        expect(mock).lastCalledWith(
            "http://myApi.com/records/comment/1",
            {
                method: "DELETE"
            }
        );

        expect(result).toEqual({
            data: {
                title: "myComment",
                content: "This is a test comment",
                id: 1
            },
        });
    });

    it("deleteMany", async () => {
        const result = await dataProvider.deleteMany("comment", { ids: [1, 2] });

        expect(mock).lastCalledWith(
            "http://myApi.com/records/comment/1,2",
            {
                method: "DELETE"
            }
        );

        expect(result).toEqual({
            data: [1, 2],
        });
    });

    it("getList", async () => {
        mock.mockImplementationOnce(() => ({ json: { records: [{ id: 1, title: "myComment", content: "This is a test comment" }], results: 1 } }));

        const result = await dataProvider.getList("comment", {
            filter: {
                id_in: [1, 2, 3, 4, 5],
                title_cs: "Comm"
            },
            pagination: {
                page: 1,
                perPage: 10
            },
            sort: {
                field: "title",
                order: "ASC"
            }
        });

        expect(mock).lastCalledWith(
            "http://myApi.com/records/comment?order=title,ASC&page=1,10&filter=id,in,1,2,3,4,5&filter=title,cs,Comm",
            undefined
        );

        expect(result).toEqual({
            data:
                [{
                    id: 1,
                    content: "This is a test comment",
                    title: "myComment",
                }],
            total: 1,
        });
    });

    it("getMany", async () => {
        mock.mockImplementationOnce(() => ({
            json: [
                { id: 1, title: "myComment", content: "This is a test comment" },
                { id: 2, title: "secondComment", content: "This is another test comment" }
            ]
        }));

        const result = await dataProvider.getMany("comment", { ids: [1, 2] });

        expect(mock).lastCalledWith(
            "http://myApi.com/records/comment/1,2",
            undefined
        );

        expect(result).toEqual({
            data:
                [{
                    id: 1,
                    content: "This is a test comment",
                    title: "myComment",
                }, {
                    id: 2,
                    content: "This is another test comment",
                    title: "secondComment",
                }]
        });
    });

    it("getMany should still return array when only fetching one record", async () => {
        mock.mockImplementationOnce(() => ({
            json: { id: 1, title: "myComment", content: "This is a test comment" }
        }));

        const result = await dataProvider.getMany("comment", { ids: [1] });

        expect(mock).lastCalledWith(
            "http://myApi.com/records/comment/1",
            undefined
        );

        expect(result).toEqual({
            data:
                [{
                    id: 1,
                    content: "This is a test comment",
                    title: "myComment",
                }]
        });
    });

    it("getManyReference", async () => {
        mock.mockImplementationOnce(() => ({
            json: {
                records: [
                    { id: 1, title: "myComment", content: "This is a test comment" },
                    { id: 2, title: "secondComment", content: "This is another test comment" }
                ],
                results: 2
            }
        }));

        const result = await dataProvider.getManyReference("comment", {
            id: "1",
            target: "post",
            filter: {
                title_cs: "Comm"
            },
            pagination: {
                page: 1,
                perPage: 10
            },
            sort: {
                field: "title",
                order: "ASC"
            }
        });

        expect(mock).lastCalledWith(
            "http://myApi.com/records/comment?order=title,ASC&page=1,10&filter=title,cs,Comm&filter=post,eq,1",
            undefined
        );

        expect(result).toEqual({
            data:
                [{
                    id: 1,
                    content: "This is a test comment",
                    title: "myComment",
                }, {
                    id: 2,
                    content: "This is another test comment",
                    title: "secondComment",
                }],
            total: 2
        });
    });

    it("getOne", async () => {
        mock.mockImplementationOnce(() => ({
            json: {
                id: 1, title: "myComment", content: "This is a test comment"
            }
        }));

        const result = await dataProvider.getOne("comment", {
            id: "1"
        });

        expect(mock).lastCalledWith(
            "http://myApi.com/records/comment/1",
            undefined
        );

        expect(result).toEqual({
            data: {
                id: 1,
                content: "This is a test comment",
                title: "myComment",
            },
        });
    });

    it("update", async () => {
        mock.mockImplementationOnce(() => ({
            json: {
                id: 1, title: "New Title", content: "This is a test comment"
            }
        }));

        const result = await dataProvider.update<RaRecord>("comment", {
            id: "1",
            data: {
                title: "New Title"
            },
            previousData: {
                id: 1, title: "myComment", content: "This is a test comment"
            }
        });

        expect(mock).lastCalledWith(
            "http://myApi.com/records/comment/1",
            {
                body: JSON.stringify({
                    title: "New Title"
                }),
                method: "PUT"
            }
        );

        expect(result).toEqual({
            data: {
                id: 1,
                content: "This is a test comment",
                title: "New Title",
            },
        });
    });

    it("updateMany", async () => {
        mock.mockImplementationOnce(() => ({
            json: {
                id: 1, title: "New Title", content: "This is a test comment"
            }
        }));

        const result = await dataProvider.updateMany("comment", {
            ids: [1, 2],
            data: [{
                id: 1,
                title: "New Title"
            }, {
                id: 2,
                title: "Another new Title"
            }],
        });

        expect(mock).lastCalledWith(
            "http://myApi.com/records/comment/1,2",
            {
                body: JSON.stringify([{
                    id: 1,
                    title: "New Title"
                }, {
                    id: 2,
                    title: "Another new Title"
                }]),
                method: "PUT"
            }
        );

        expect(result).toEqual({
            data: [1, 2],
        });
    });

    it("update and delete should at least return { id } if no previousdata is supplied", async () => {
        const updateResult = await dataProvider.update("comment", { id: 1, data: { title: "New Title" }, previousData: {} as any });
        expect(updateResult).toEqual({ data: { id: 1, title: "New Title" } });

        const deleteResult = await dataProvider.delete("comment", { id: 1 });
        expect(deleteResult).toEqual({ data: { id: 1 } });
    });
});