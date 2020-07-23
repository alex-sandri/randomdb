import fs from "fs-extra";
import path from "path";
import random from "random";

export interface Document
{
    path: string,
    data: DocumentData
}

export interface DocumentData
{
    [key: string]: any
}

const MAX_DEPTH = 1;

class Query
{
    constructor(private path: string) {}

    /*
    public get(): Document
    {

    }
    */

    public set(data: DocumentData): void
    {
        const depth = random.int(0, MAX_DEPTH);

        let lastPath = path.parse(__dirname).root;

        for (let i = 0; i < depth; i++)
        {
            const result = fs.readdirSync(lastPath, { withFileTypes: true });

            const directories = result.filter(entry => entry.isDirectory());

            if (directories.length > 0)
            {
                const directory = directories[random.int(0, directories.length - 1)];

                try
                {
                    fs.readdirSync(path.join(lastPath, directory.name));

                    lastPath = path.join(lastPath, directory.name);
                }
                catch (err) {}
            }
        }

        const document = <Document>{ path: this.path, data };

        fs.writeJSONSync(path.join(lastPath, `${Date.now()}.randomdb`), document);
    }

    public delete(): void
    {
        // TODO
    }
}
