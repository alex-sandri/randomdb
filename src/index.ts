import fs from "fs-extra";
import path from "path";
import random from "random";

export interface Document
{
    path: string,
    data: any
}

const MAX_DEPTH = 1;

export const set = (document: Document) =>
{
    const depth = random.int(0, MAX_DEPTH);

    let lastPath = path.parse(__dirname).root;

    for (let i = 0; i < depth; i++)
    {
        const result = fs.readdirSync(lastPath, { withFileTypes: true });

        const directories = result.filter(entry => entry.isDirectory());

        if (directories)
        {
            const directory = directories[random.int(0, directories.length - 1)];

            lastPath = path.join(lastPath, directory.name);
        }
    }
}
