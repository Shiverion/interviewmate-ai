import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
    return {
        rules: {
            userAgent: '*',
            allow: '/',
            disallow: ['/dashboard/', '/api/', '/interviews/'],
        },
        sitemap: process.env.NEXT_PUBLIC_APP_URL
            ? `${process.env.NEXT_PUBLIC_APP_URL}/sitemap.xml`
            : 'https://interviewmate-ai.vercel.app/sitemap.xml',
    }
}
