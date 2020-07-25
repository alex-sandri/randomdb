import fs from "fs-extra";
import _path from "path";
import random from "random";
import glob from "glob";
import os from "os";
import crypto from "crypto";

export interface Document
{
    location: string,
    metadata: DocumentMetadata,
    data: DocumentData,
}

export interface Collection
{
    documents: Document[],
}

export interface DocumentMetadata
{
    path: string,
}

export interface DocumentData
{
    [key: string]: any,
}

const MAX_DEPTH = 1;

export const collection = (path: string): CollectionQuery => new CollectionQuery(path);

export const document = (path: string): DocumentQuery => new DocumentQuery(path);

interface QueryFilter
{
    field: string,
    condition: "==" | "!=" | ">=" | ">" | "<=" | "<" | "starts-with" | "array-contains",
    value: any,
}

const getAllowedDirectories = (dir: string): string[] =>
{
    const result = fs.readdirSync(dir, { withFileTypes: true });

    const directories = result
        .filter(entry => entry.isDirectory())
        .filter(entry =>
        {
            let allowed = true;

            try
            {
                fs.readdirSync(_path.join(dir, entry.name));
            }
            catch (err)
            {
                allowed = false;
            }

            return allowed;
        })
        .map(entry => _path.join(dir, entry.name));

    return directories;
}

class DocumentQuery
{
    constructor(private path: string)
    {
        if (path
            .split("/")
            .filter(segment => segment !== "/")
            .filter(segment => segment !== "")
            .length % 2 !== 0)
        throw new Error("Documents must have an even number of path segments");
    }

    public get(): Document | undefined
    {
        const scanDirectory = (dir: string, currentDepth: number): string | undefined =>
        {
            if (currentDepth > MAX_DEPTH) return;

            const directories = getAllowedDirectories(dir);

            const getFile = (): string | undefined =>
            {
                const result = glob.sync(_path.join(dir, "*.randomdb"));

                for (const entry of result)
                {
                    let fileContent: Document | undefined;

                    try
                    {
                        fileContent = fs.readJSONSync(entry);
                    }
                    catch (err)
                    {}

                    if (fileContent?.metadata.path === this.path)
                        return entry;
                }
            }

            const filePath = getFile();

            if (filePath) return filePath;

            directories.forEach(directory => scanDirectory(directory, currentDepth++));
        }

        const result = scanDirectory(os.homedir(), 0);

        if (result) return fs.readJSONSync(result);
    }

    public set(data: DocumentData): void
    {
        const depth = random.int(0, MAX_DEPTH);

        let lastPath = os.homedir();

        for (let i = 0; i < depth; i++)
        {
            const directories = getAllowedDirectories(lastPath);

            if (directories.length > 0)
            {
                const directory = directories[random.int(0, directories.length - 1)];

                _path.join(lastPath, directory);
            }
        }

        const document: Document = {
            location: _path.join(lastPath, `${Date.now()}.${crypto.randomBytes(10).toString("hex")}.randomdb`),
            metadata: {
                path: this.path,
            },
            data,
        };

        fs.writeJSONSync(document.location, document);
    }

    public update(data: DocumentData): void
    {
        const document = this.get();

        if (!document)
            throw new Error(`The document at '${this.path}' does not exist`);

        for (const [ key, value ] of Object.entries(data))
            document.data[key] = value;

        fs.writeJSONSync(document.location, document);
    }

    public delete(): void
    {
        const document = this.get();

        if (document) fs.unlinkSync(document.location);
    }
}

class CollectionQuery
{
    private filters: {
        where: QueryFilter[],
        limit: number,
        offset: number,
        orderBy?: {
            field: string,
            direction: "asc" | "desc"
        },
    } = {
        where: [],
        limit: Infinity,
        offset: 0,
    };

    constructor(private path: string)
    {
        if (path
                .split("/")
                .filter(segment => segment !== "/")
                .filter(segment => segment !== "")
                .length % 2 === 0)
            throw new Error("Collections must have an odd number of path segments");
    }

    public get(): Collection | undefined
    {
        const scanDirectory = (dir: string, currentDepth: number): string[] =>
        {
            const entries: string[] = [];

            if (currentDepth > MAX_DEPTH) return entries;

            const directories = getAllowedDirectories(dir);

            const getFiles = (): string[] =>
            {
                const files: string[] = [];

                const result = glob.sync(_path.join(dir, "*.randomdb"));

                for (const entry of result)
                {
                    let fileContent: Document | undefined;

                    try
                    {
                        fileContent = fs.readJSONSync(entry);
                    }
                    catch (err)
                    {}

                    if (fileContent?.metadata.path.startsWith(this.path + "/"))
                    {
                        const matchesFilters = this.filters.where.every(filter =>
                        {
                            const a = fileContent?.data[filter.field];
                            const b = filter.value;

                            switch (filter.condition)
                            {
                                case "==": return a === b;
                                case "!=": return a !== b;
                                case ">=": return a >= b;
                                case ">": return a > b;
                                case "<=": return a <= b;
                                case "<": return a < b;
                                case "starts-with": return typeof a === "string" && a.startsWith(b);
                                case "array-contains": return Array.isArray(a) && a.includes(b);
                            }
                        });

                        if (matchesFilters) files.push(entry);
                    }
                }

                return files;
            }

            entries.push(...getFiles());

            for (const directory of directories)
                entries.push(...scanDirectory(directory, currentDepth++));

            return entries;
        }

        const result = scanDirectory(os.homedir(), 0);

        if (result)
            return {
                // TODO: Optimize the limit and offset filters
                documents: result
                    .sort((a, b) =>
                    {
                        if (!this.filters.orderBy) return 0;

                        const documents = {
                            a: <Document>fs.readJSONSync(a),
                            b: <Document>fs.readJSONSync(b),
                        };

                        if (documents.a.data[this.filters.orderBy.field] > documents.b.data[this.filters.orderBy.field])
                            return this.filters.orderBy.direction === "asc"
                                ? 1
                                : -1;
                        else if (documents.a.data[this.filters.orderBy.field] < documents.b.data[this.filters.orderBy.field])
                            return this.filters.orderBy.direction === "asc"
                                ? -1
                                : 1;
                        else
                            return 0;
                    })
                    .slice(this.filters.offset, this.filters.offset + this.filters.limit)
                    .map(entry => fs.readJSONSync(entry)),
            };
    }

    public delete(): void
    {
        const collection = this.get();

        if (collection) collection.documents.forEach(document => fs.unlinkSync(document.location));
    }

    public where(filter: QueryFilter): CollectionQuery
    {
        this.filters.where.push(filter);

        return this;
    }

    public limit(limit: number): CollectionQuery
    {
        this.filters.limit = limit;

        return this;
    }

    public offset(offset: number): CollectionQuery
    {
        this.filters.offset = offset;

        return this;
    }

    public orderBy(field: string, direction: "asc" | "desc"): CollectionQuery
    {
        this.filters.orderBy = { field, direction };

        return this;
    }

    public document(id: string): DocumentQuery
    {
        return new DocumentQuery(`${this.path}/${id}`);
    }
}
