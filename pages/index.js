// pages/index.js

import Image from 'next/image';
import React, { useCallback, useEffect, useState } from 'react';

const ENV_NAV_NAME = process.env.NEXT_PUBLIC_NAV_NAME ?? '';
const SHOULD_FETCH_TITLE = !ENV_NAV_NAME;

const IndexPage = () => {
    const [allPages, setAllPages] = useState([]);
    const [filteredPages, setFilteredPages] = useState([]);
    const [uniqueTags, setUniqueTags] = useState([]);
    const [activeTag, setActiveTag] = useState('全部');
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [titleName, setTitleName] = useState(ENV_NAV_NAME);

    const extractUniqueTagsFromResults = useCallback((results) => {
        const tags = new Set();
        results.forEach((page) => {
            const multiSelect = page?.properties?.Category?.multi_select ?? [];
            multiSelect.forEach((tag) => {
                if (tag?.name) {
                    tags.add(tag.name);
                }
            });
        });
        return Array.from(tags);
    }, []);

    const filterByTag = useCallback((tag, pages) => {
        if (!Array.isArray(pages)) {
            return [];
        }
        if (tag === '全部') {
            return pages;
        }
        return pages.filter((page) => {
            const multiSelect = page?.properties?.Category?.multi_select ?? [];
            return multiSelect.some((item) => item?.name === tag);
        });
    }, []);

    useEffect(() => {
        let isMounted = true;
        const controller = new AbortController();

        const loadDatabaseContent = async () => {
            try {
                const response = await fetch('/api/getDatabaseContent', { signal: controller.signal });
                if (!response.ok) {
                    throw new Error('Failed to load database content');
                }
                const data = await response.json();
                if (!isMounted) {
                    return;
                }
                const results = data?.results ?? [];
                setAllPages(results);
                const tags = Array.isArray(data?.uniqueTags)
                    ? data.uniqueTags
                    : extractUniqueTagsFromResults(results);
                setUniqueTags(tags);
            } catch (error) {
                if (error.name !== 'AbortError') {
                    console.error(error);
                }
            }
        };

        loadDatabaseContent();

        return () => {
            isMounted = false;
            controller.abort();
        };
    }, [extractUniqueTagsFromResults]);

    useEffect(() => {
        if (!SHOULD_FETCH_TITLE) {
            return undefined;
        }
        let isMounted = true;
        const controller = new AbortController();

        const loadTitle = async () => {
            try {
                const response = await fetch('/api/getTitleName', { signal: controller.signal });
                if (!response.ok) {
                    throw new Error('Failed to load title');
                }
                const data = await response.json();
                if (isMounted && data?.titleName) {
                    setTitleName(data.titleName);
                }
            } catch (error) {
                if (error.name !== 'AbortError') {
                    console.error(error);
                }
            }
        };

        loadTitle();

        return () => {
            isMounted = false;
            controller.abort();
        };
    }, []);

    useEffect(() => {
        const header = typeof document !== 'undefined' ? document.querySelector('header') : null;
        const footer = typeof document !== 'undefined' ? document.querySelector('footer') : null;
        const bodyElement = typeof document !== 'undefined' ? document.body : null;
        const mainElement = typeof document !== 'undefined' ? document.querySelector('main') : null;

        if (!bodyElement || !mainElement) {
            return undefined;
        }

        const applyOffsets = () => {
            const headerHeight = header?.offsetHeight ?? 0;
            const footerHeight = footer?.offsetHeight ?? 0;

            bodyElement.style.paddingTop = `${headerHeight}px`;
            mainElement.style.paddingBottom = `${footerHeight}px`;
        };

        const resizeHandler = () => {
            if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
                window.requestAnimationFrame(applyOffsets);
            } else {
                applyOffsets();
            }
        };

        applyOffsets();

        let resizeObserver;
        if (typeof window !== 'undefined' && 'ResizeObserver' in window) {
            resizeObserver = new ResizeObserver(applyOffsets);
            if (header) {
                resizeObserver.observe(header);
            }
            if (footer) {
                resizeObserver.observe(footer);
            }
        }

        if (typeof window !== 'undefined') {
            window.addEventListener('resize', resizeHandler);
        }

        return () => {
            if (typeof window !== 'undefined') {
                window.removeEventListener('resize', resizeHandler);
            }
            resizeObserver?.disconnect();
        };
    }, []);

    useEffect(() => {
        setFilteredPages(filterByTag(activeTag, allPages));
    }, [activeTag, allPages, filterByTag]);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        try {
            const response = await fetch('/api/getDatabaseContent', { method: 'POST' });
            if (!response.ok) {
                throw new Error('Failed to refresh cache');
            }
            const data = await response.json();
            const results = data?.results ?? [];
            setAllPages(results);
            const tags = Array.isArray(data?.uniqueTags)
                ? data.uniqueTags
                : extractUniqueTagsFromResults(results);
            setUniqueTags(tags);
        } catch (error) {
            console.error(error);
        } finally {
            setIsRefreshing(false);
        }
    };

    return (
        <>
            <header className='blur'>
                <div id='title'>
                    <div id="left">
                        <img src="/logo.webp" alt="图片加载失败" />
                        <h1>{titleName}<br />
                            Nav
                        </h1>
                        <button
                            id="refresh-button"
                            type="button"
                            onClick={handleRefresh}
                            disabled={isRefreshing}
                            aria-label="刷新数据"
                        />
                    </div>
                    <div id="right">
                        <p>
                            {titleName} Nav</p>
                        <p>Database for Notion
                        </p>
                    </div>
                </div>
                <div id="nav">
                    <button
                        type="button"
                        className={`nav-button ${activeTag === '全部' ? 'active' : ''}`}
                        onClick={() => setActiveTag('全部')}
                    >全部</button>
                    {uniqueTags && uniqueTags.map((tag) => (
                        <button
                            type="button"
                            className={`nav-button ${activeTag === tag ? 'active' : ''}`}
                            key={tag}
                            onClick={() => setActiveTag(tag)}
                        >
                            {tag}
                        </button>
                    ))}
                </div>
            </header>
            <main>
                <div id="cards-container">
                    {filteredPages && filteredPages.map((page) => {
                        const iconFile = page?.properties?.Icons?.files?.[0];
                        const imageUrl = iconFile?.external?.url ?? iconFile?.file?.url ?? '/logo.webp';
                        const title = page?.properties?.Name?.title?.[0]?.plain_text ?? '未命名';
                        const description = page?.properties?.Description?.rich_text?.[0]?.plain_text ?? '';
                        const websiteUrl = page?.properties?.Website?.url ?? '#';
                        const tags = page?.properties?.Category?.multi_select ?? [];
                        return (
                            <a href={websiteUrl} target="_blank" rel="noopener noreferrer" className="card" key={page?.id ?? title}>
                                <div className='icons'>
                                    <Image
                                        src={imageUrl}
                                        alt={title}
                                        width={64}
                                        height={64}
                                        className="card-image-shadow"
                                        sizes="64px"
                                    />
                                    <Image
                                        src={imageUrl}
                                        alt={title}
                                        width={64}
                                        height={64}
                                        className="card-image"
                                        sizes="64px"
                                    />
                                </div>
                                <h2 className="card-title">{title}</h2>
                                <div className="card-tags">
                                    {tags.map((tag) => (
                                        <span className="tag" key={`${page?.id ?? title}-${tag?.id ?? tag?.name}`}>
                                            {tag?.name}
                                        </span>
                                    ))}
                                </div>
                                <p>{description}</p>
                            </a>
                        );
                    })}
                </div>
            </main>
            <footer className='blur'>
                <img src="/next.svg" alt="图片加载失败" />
                <a href="https://vercel.com/kailous/rain-forest-notion-nav"><img src="/vercel.svg" alt="图片加载失败" /></a>
                <a href="https://github.com/kailous/RainForest-Notion-Nav"><img src="/github.svg" alt="图片加载失败" /></a>
                <p>Notion database nav for RainForest, developed by Kailous.</p>
            </footer>
        </>
    );
};

export default IndexPage;
