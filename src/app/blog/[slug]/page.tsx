import { notFound } from 'next/navigation';
import clientPromise from '@/lib/mongodb';
import { formatDate } from '@/lib/utils';
import Image from 'next/image';
import { Calendar, User, Clock, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import ShareButtons from '@/components/blog/ShareButtons';
import BlogComments from '@/components/blog/BlogComments';

interface BlogPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateStaticParams() {
  try {
    const client = await clientPromise;
    const db = client.db();
    const blogs = await db.collection('blogs').find({}, { projection: { slug: 1 } }).toArray();
    
    return blogs.map((blog) => ({
      slug: blog.slug,
    }));
  } catch (error) {
    console.error('Error generating static params:', error);
    return [];
  }
}

export async function generateMetadata({ params }: BlogPageProps) {
  try {
    const { slug } = await params;
    const client = await clientPromise;
    const db = client.db();
    const blog = await db.collection('blogs').findOne({ slug });
    
    // Remove trailing slash if present
    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.bullisheyes.com').replace(/\/$/, '');

    if (!blog) {
      return {
        title: 'Blog Not Found - Bullish Eyes',
      };
    }

    const url = `${siteUrl}/blog/${blog.slug}`;
    const imageUrl = blog.banner_image_url && !blog.banner_image_url.startsWith('http') 
      ? `${siteUrl}${blog.banner_image_url}` 
      : blog.banner_image_url;

    return {
      metadataBase: new URL(siteUrl),
      title: `${blog.heading} - Bullish Eyes Blog`,
      description: blog.subheading || blog.heading,
      openGraph: {
        title: blog.heading,
        description: blog.subheading || blog.heading,
        url,
        siteName: 'Bullish Eyes',
        locale: 'en_US',
        type: 'article',
        images: imageUrl ? [{
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: blog.heading,
        }] : [],
      },
      twitter: {
        card: 'summary_large_image',
        title: blog.heading,
        description: blog.subheading || blog.heading,
        images: imageUrl ? [imageUrl] : [],
      },
      alternates: {
        canonical: url,
      },
      other: {
        'og:image:width': '1200',
        'og:image:height': '630',
      }
    };
  } catch (error) {
    return {
      title: 'Blog - Bullish Eyes',
    };
  }
}

export default async function BlogPage({ params }: BlogPageProps) {
  try {
    const { slug } = await params;
    const client = await clientPromise;
    const db = client.db();
    const blog = await db.collection('blogs').findOne({ slug });

    if (!blog) {
      notFound();
    }

    // Get the absolute URL for the blog
    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.bullisheyes.com').replace(/\/$/, '');
    const canonicalUrl = `${siteUrl}/blog/${blog.slug}`;
    
    // Calculate reading time
    const readTime = Math.ceil(blog.content.replace(/<[^>]*>/g, '').split(' ').length / 200);

    return (
      <div className="min-h-screen bg-gray-50">
        <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Back Button */}
          <div className="mb-6">
            <Link href="/blog">
              <Button variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Blog
              </Button>
            </Link>
          </div>

          {/* Banner Image */}
          {blog.banner_image_url && (
            <div className="relative h-64 md:h-96 w-full mb-8 rounded-xl overflow-hidden shadow-lg">
              <Image
                src={blog.banner_image_url}
                alt={blog.heading}
                fill
                className="object-cover"
                priority
              />
            </div>
          )}

          {/* Article Header */}
          <header className="mb-8">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4 leading-tight">
              {blog.heading}
            </h1>
            
            {blog.subheading && (
              <h2 className="text-xl md:text-2xl text-gray-600 mb-6 leading-relaxed">
                {blog.subheading}
              </h2>
            )}

            {/* Meta Information */}
            <div className="flex flex-wrap items-center gap-6 text-sm text-gray-600 pb-6 border-b border-gray-200">
              <div className="flex items-center space-x-2">
                <User className="w-4 h-4" />
                <span>By {blog.author}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4" />
                <span>{formatDate(new Date(blog.publish_date))}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4" />
                <span>{readTime} min read</span>
              </div>
            </div>
          </header>

          {/* Article Content */}
          <div className="prose prose-lg max-w-none">
  <div dangerouslySetInnerHTML={{ __html: blog.content }} />
</div>


          {/* Share Section */}
          <div className="mt-8 pb-8 border-b border-gray-200">
            {/* Remove trailing slash if present */}
            <ShareButtons 
              url={`${(process.env.NEXT_PUBLIC_SITE_URL || 'https://www.bullisheyes.com').replace(/\/$/, '')}/blog/${blog.slug}`}
              title={blog.heading}
              description={blog.subheading}
              imageUrl={blog.banner_image_url && !blog.banner_image_url.startsWith('http') 
                ? `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.bullisheyes.com'}${blog.banner_image_url}` 
                : blog.banner_image_url}
            />
          </div>

          {/* Article Footer */}
          <footer className="mt-12 pt-8 border-t border-gray-200">
            <div className="bg-blue-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                About the Author
              </h3>
              <p className="text-gray-600">
                {blog.author} is a financial expert at Bullish Eyes, specializing in investment strategies and market analysis.
              </p>
            </div>

            {/* Comments Section */}
            <BlogComments blogId={blog._id.toString()} />
          </footer>
        </article>
      </div>
    );
  } catch (error) {
    console.error('Error loading blog:', error);
    notFound();
  }
}
