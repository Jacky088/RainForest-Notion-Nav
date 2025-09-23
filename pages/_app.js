// _app.js
// 是一个特殊的文件名，它不能被删除。在这个文件中，你可以覆盖App组件，它是Next.js中所有页面的父组件。你可以使用它来保持状态，这意味着在页面之间导航时，它将保持不变。

// 引入全局样式
import '@/pages/css/style.css';
// 引入Head
import Head from 'next/head';
// 引入Analytics
import { Analytics } from '@vercel/analytics/react';
// 引入React
import React, { useEffect, useState } from 'react';

const DEFAULT_OG_INFO = {
    title: process.env.NEXT_PUBLIC_NAV_NAME ?? '',
    image: process.env.NEXT_PUBLIC_OG_IMG ?? '',
    description: process.env.NEXT_PUBLIC_OG_DESC ?? '',
    url: process.env.NEXT_PUBLIC_OG_URL ?? '',
    logo: process.env.NEXT_PUBLIC_OG_LOGO ?? '',
    keywords: process.env.NEXT_PUBLIC_OG_KEYWORDS ?? '',
};

const SHOULD_FETCH_OG_INFO = Object.values(DEFAULT_OG_INFO).some((value) => !value);

const DEFAULT_TITLE = process.env.NEXT_PUBLIC_NAV_NAME ?? '';

function MyApp({ Component, pageProps }) {
    const [ogInfo, setOgInfo] = useState(DEFAULT_OG_INFO);
    const [title, setTitle] = useState(DEFAULT_TITLE);

    useEffect(() => {
        if (!SHOULD_FETCH_OG_INFO) {
            return undefined;
        }
        let isMounted = true;
        const controller = new AbortController();

        const loadOgInfo = async () => {
            try {
                const response = await fetch('/api/getOGinfo', { signal: controller.signal });
                if (!response.ok) {
                    throw new Error('Failed to load OG info');
                }
                const data = await response.json();
                if (!isMounted) {
                    return;
                }
                setOgInfo((prev) => ({
                    title: data?.ogTitle ?? prev.title,
                    image: data?.ogImg ?? prev.image,
                    description: data?.ogDesc ?? prev.description,
                    url: data?.ogUrl ?? prev.url,
                    logo: data?.ogLogo ?? prev.logo,
                    keywords: data?.ogKeywords ?? prev.keywords,
                }));
                if (!DEFAULT_TITLE && data?.ogTitle) {
                    setTitle(data.ogTitle);
                }
            } catch (error) {
                if (error.name !== 'AbortError') {
                    console.error(error);
                }
            }
        };

        loadOgInfo();

        return () => {
            isMounted = false;
            controller.abort();
        };
    }, []);

    return (
        <>
            <Head>
                <title>{title}</title>
                <meta property="twitter:image" content={ogInfo.image} />
                <meta property="twitter:card" content="app" />
                <meta property="twitter:title" content={ogInfo.title} />
                <meta property="twitter:description" content={ogInfo.description} />
                <meta property="description" content={ogInfo.description} />
                <meta property="og:image" content={ogInfo.image} />
                <meta property="og:title" content={ogInfo.title} />
                <meta property="og:description" content={ogInfo.description} />
                <meta property="og:url" content={ogInfo.url} />
                <meta property="og:type" content="website" />
                <meta property="og:site_name" content={ogInfo.title} />
                <meta name="name" content={ogInfo.title} />
                <meta name="description" content={ogInfo.description} />
                <meta name="keywords" content={ogInfo.keywords} />
                <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0" />
                <meta name="image" content={ogInfo.image} />
                <meta name="viewport" content="width=device-width,initial-scale=1" />
                <meta name="color-scheme" content="normal" />
                <meta name="apple-mobile-web-app-capable" content="yes" />
                <meta name="apple-mobile-web-app-status-bar-style" content="White" />
                <meta name="apple-mobile-web-app-title" content={ogInfo.title} />
                <meta name="msapplication-TileImage" content={ogInfo.logo} />
                <meta name="msapplication-TileColor" content="#ffffff" />
                <meta httpEquiv="content-Type" content="text/html; charset=UTF-8" />
                <meta httpEquiv="X-UA-Compatible" content="IE=edge,chrome=1" />
            </Head>
            <Component {...pageProps} />
            <Analytics />
        </>
    );
}

export default MyApp;
