import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { api } from "@/lib/api";

export default function BlogPost() {
  const { slug } = useParams();
  const [post, setPost] = useState(null);

  useEffect(() => {
    setPost(null);
    api.get(`/blog/${slug}`).then((r) => setPost(r.data)).catch(() => setPost(false));
  }, [slug]);

  if (post === false) return <div className="pt-40 text-center min-h-screen">Article not found.</div>;
  if (!post) return <div className="pt-40 text-center min-h-screen label">Loading…</div>;

  return (
    <div data-testid="blog-post-page" className="pt-32 md:pt-40 pb-24 min-h-screen">
      <article className="max-w-[760px] mx-auto px-6">
        <Link to="/journal" className="label inline-flex items-center gap-2 mb-10 hover:text-[#DF0000] transition-colors">
          <ArrowLeft className="w-4 h-4" /> All Articles
        </Link>
        <div className="label text-[#DF0000] mb-6">{post.category} · {post.read_time} · {post.date}</div>
        <h1 className="font-display text-5xl md:text-6xl tracking-tight leading-[0.95] mb-10">{post.title}</h1>
        <div className="text-lg leading-relaxed text-[#222] space-y-6">
          {post.body.split("\n\n").map((para, i) => (
            <p key={i}>{para}</p>
          ))}
        </div>
      </article>
    </div>
  );
}
