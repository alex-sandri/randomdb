import fs from "fs-extra";
import _path from "path";
import random from "random";
import glob from "fast-glob";
import os from "os";
import crypto from "crypto";
import _ from "lodash";

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
	created: Date,
	lastModified: Date,
}

export interface DocumentData
{
	[key: string]: any,
}

const MAX_DEPTH = 100;

export const collection = (path: string): CollectionQuery => new CollectionQuery(path);

export const document = (path: string): DocumentQuery => new DocumentQuery(path);

interface QueryFilter
{
	field: string,
	condition:
		"=="
		| "!="
		| ">="
		| ">"
		| "<="
		| "<"
		| "starts-with"
		| "ends-with"
		| "string-contains"
		| "array-contains",
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
};

enum FieldValueType
{
	WRITE_TIMESTAMP,
	ARRAY_UNION,
	ARRAY_REMOVE,
}

interface IFieldValue
{
	type: FieldValueType,
	data?: any,
}

class FieldValue
{
	public static writeTimestamp(): IFieldValue
	{
		return {
			type: FieldValueType.WRITE_TIMESTAMP,
		};
	}

	public static arrayUnion(value: any): IFieldValue
	{
		return {
			type: FieldValueType.ARRAY_UNION,
			data: value,
		};
	}

	public static arrayRemove(value: any): IFieldValue
	{
		return {
			type: FieldValueType.ARRAY_REMOVE,
			data: value,
		};
	}
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

		this.parsePath();
	}

	public get(): Document | undefined
	{
		const result = glob.sync("**/*.randomdb", { deep: MAX_DEPTH, suppressErrors: true, cwd: os.homedir(), absolute: true }).find(entry =>
		{
			let fileContent: Document | undefined;

			try
			{
				fileContent = fs.readJSONSync(entry);
			}
			catch (err)
			{}

			return fileContent?.metadata.path === this.path;
		});

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

				lastPath = directory;
			}
		}

		const time = new Date();

		const document: Document = {
			location: _path.join(lastPath, `${Date.now()}.${crypto.randomBytes(10).toString("hex")}.randomdb`),
			metadata: {
				path: this.path,
				created: time,
				lastModified: time,
			},
			data: this.parseData(data),
		};

		fs.writeJSONSync(document.location, document);
	}

	public update(data: DocumentData): void;

	public update(field: string, value: any): void;

	public update(a: DocumentData | string, b?: any): void
	{
		const document = this.get();

		if (!document)
			throw new Error(`The document at '${this.path}' does not exist`);

		if (typeof a === "string") _.set(document.data, a, b);
		else
			for (const [ key, value ] of Object.entries(a))
				document.data[key] = value;

		document.data = this.parseData(document.data);

		document.metadata.lastModified = new Date();

		fs.writeJSONSync(document.location, document);
	}

	public delete(): void
	{
		const document = this.get();

		if (document) fs.unlinkSync(document.location);
	}

	public collection(id: string): CollectionQuery
	{
		return collection(`${this.path}/${id}`);
	}

	private generateId = (): string =>
	{
		const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

		const ID_LENGTH = 25;

		let id = "";

		for (let i = 0; i < ID_LENGTH; i++)
			id += charset[random.int(0, charset.length - 1)];

		return id;
	}

	private parsePath = () =>
	{
		this.path = this.path.replace(/{{AUTO_ID}}/, this.generateId());
	}

	private parseData(data: DocumentData): DocumentData
	{
		const document = this.get();

		for (const [ key, value ] of Object.entries(data))
		{
			let newValue;

			switch (value?.type)
			{
				case FieldValueType.WRITE_TIMESTAMP:
					newValue = new Date();
					break;
				case FieldValueType.ARRAY_UNION:
					if (document?.data[key] && !Array.isArray(document?.data[key]))
						throw new Error(`'${key}' is not an array`);

					newValue = [ ...(document?.data[key] ?? []), (<IFieldValue>value).data ];
					break;
				case FieldValueType.ARRAY_REMOVE:
					if (document?.data[key] && !Array.isArray(document?.data[key]))
						throw new Error(`'${key}' is not an array`);

					if (document?.data[key])
						newValue = _.reject(document.data[key], (<IFieldValue>value).data);
					break;
				default:
					break;
			}

			data[key] = newValue ?? value;
		}

		return data;
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

	public get(): Collection
	{
		const result = glob.sync("**/*.randomdb", { deep: MAX_DEPTH, suppressErrors: true, cwd: os.homedir(), absolute: true }).filter(entry =>
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
						case "ends-with": return typeof a === "string" && a.endsWith(b);
						case "string-contains": return typeof a === "string" && a.includes(b);
						case "array-contains": return Array.isArray(a) && a.includes(b);
					}
				});

				return matchesFilters;
			}
		});

		return {
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
		return document(`${this.path}/${id}`);
	}

	public add(data: DocumentData): void
	{
		document(`${this.path}/{{AUTO_ID}}`).set(data);
	}
}
