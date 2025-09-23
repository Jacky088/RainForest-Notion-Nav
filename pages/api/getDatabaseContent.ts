// pages/api/getDatabaseContent.ts

import { NextApiRequest, NextApiResponse } from 'next';
import { Client } from '@notionhq/client';
import * as dotenv from 'dotenv';
import type { QueryDatabaseResponse } from '@notionhq/client/build/src/api-endpoints';

dotenv.config();

const notion = new Client({ auth: process.env.NOTION_API_KEY });

const ALL_KEY = '__all__';
const databaseContentCache = new Map<string, QueryDatabaseResponse>();
let uniqueTagsCache: string[] | null = null;

const extractUniqueTags = (results: QueryDatabaseResponse['results']): string[] => {
    const tags = new Set<string>();
    results.forEach((page) => {
        const multiSelect = (page as any)?.properties?.Category?.multi_select ?? [];
        multiSelect.forEach((tag: { name?: string }) => {
            if (tag?.name) {
                tags.add(tag.name);
            }
        });
    });
    return Array.from(tags);
};

const buildResponsePayload = (response: QueryDatabaseResponse, includeTags: boolean) => ({
    ...response,
    ...(includeTags ? { uniqueTags: uniqueTagsCache ?? extractUniqueTags(response.results) } : {}),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
    const tag = Array.isArray(req.query.tag) ? req.query.tag[0] : req.query.tag;
    const cacheKey = tag ?? ALL_KEY;

    if (req.method === 'GET') {
        if (databaseContentCache.has(cacheKey)) {
            const cached = databaseContentCache.get(cacheKey)!;
            res.status(200).json(buildResponsePayload(cached, cacheKey === ALL_KEY));
            return;
        }

        try {
            const query: Record<string, unknown> = {
                database_id: process.env.DATABASE_ID!,
            };

            if (tag) {
                query.filter = {
                    property: 'Category',
                    multi_select: {
                        contains: tag,
                    },
                };
            }

            const response = await notion.databases.query(query as any);

            databaseContentCache.set(cacheKey, response);
            if (!tag) {
                uniqueTagsCache = extractUniqueTags(response.results);
            }

            res.status(200).json(buildResponsePayload(response, !tag));
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to get database content' });
        }
        return;
    }

    if (req.method === 'POST') {
        try {
            const response = await notion.databases.query({
                database_id: process.env.DATABASE_ID!,
            });

            databaseContentCache.clear();
            databaseContentCache.set(ALL_KEY, response);
            uniqueTagsCache = extractUniqueTags(response.results);

            res.status(200).json(buildResponsePayload(response, true));
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to refresh database content' });
        }
        return;
    }

    res.setHeader('Allow', 'GET, POST');
    res.status(405).json({ message: 'Method not allowed' });
}
