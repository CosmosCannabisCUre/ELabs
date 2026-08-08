const CONCEPTS = [
  { n: 1, name: "Planet 'C' Monogram", note: "Compact icon that works as a favicon/app mark.", url: "https://static.prod-images.emergentagent.com/jobs/1fef2c4b-6b16-4dd9-8afb-bc98d943e39c/images/f640d3db8c44122fc2cb51cdab8c67050db955248885dc08ca96b094eb1e8fb1.jpeg" },
  { n: 2, name: "Serif Orbit", note: "Elegant Bodoni wordmark — matches the site typography.", url: "https://static.prod-images.emergentagent.com/jobs/1fef2c4b-6b16-4dd9-8afb-bc98d943e39c/images/c36e0654ab2b07b2b8abfb201edcbf5aafd9273a613c144a27b3f8e555da3b71.jpeg" },
  { n: 3, name: "Emblem Seal", note: "Circular badge — great for packaging & stamps.", url: "https://static.prod-images.emergentagent.com/jobs/1fef2c4b-6b16-4dd9-8afb-bc98d943e39c/images/7030e3ad9154ea8c9d48b80f42620e6b8317d470bd3a34c847606bc5cf6d6749.jpeg" },
  { n: 4, name: "Refined Neon", note: "Premium neon in red/white only — distinct from the original.", url: "https://static.prod-images.emergentagent.com/jobs/1fef2c4b-6b16-4dd9-8afb-bc98d943e39c/images/21ed6a1a94ad975d55a124f2cd99a195e86ca72570560c873e190b825c5e47e0.jpeg" },
  { n: 5, name: "Orbit Gummy", note: "The 'O' becomes a glossy red gummy sphere with a ring.", url: "https://static.prod-images.emergentagent.com/jobs/1fef2c4b-6b16-4dd9-8afb-bc98d943e39c/images/08853b41a3682a1c92fea37dbdf6accfa4e36c7ee5e3805e0d6a257453b0986d.jpeg" },
  { n: 6, name: "Stacked Mark", note: "Crescent + leaf emblem over the wordmark.", url: "https://static.prod-images.emergentagent.com/jobs/1fef2c4b-6b16-4dd9-8afb-bc98d943e39c/images/a62a180c037863ab02e8f6c29ec19ba30497e889d9769da7654516455775737d.jpeg" },
];

export default function LogoOptions() {
  return (
    <div data-testid="logo-options-page" className="pt-32 md:pt-40 pb-28 min-h-screen">
      <div className="max-w-[1400px] mx-auto px-6 md:px-10">
        <div className="label text-[#FF2A2A] mb-4">[ Logo Concepts ]</div>
        <h1 className="font-display text-5xl md:text-7xl tracking-tight leading-[0.9] mb-4">Original Marks</h1>
        <p className="text-white/55 max-w-xl mb-16">Six original, ownable directions for Cosmos Cannabis Cure. Tell me a number and I'll set it as your site logo (and make a matching favicon).</p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {CONCEPTS.map((c) => (
            <div key={c.n} data-testid={`logo-concept-${c.n}`} className="border border-white/10 hover:border-[#DF0000] transition-colors">
              <div className="aspect-square bg-black overflow-hidden">
                <img src={c.url} alt={c.name} className="w-full h-full object-cover" />
              </div>
              <div className="p-5 border-t border-white/10">
                <div className="flex items-baseline justify-between">
                  <h3 className="font-display text-2xl">{c.name}</h3>
                  <span className="label text-white/35">0{c.n}</span>
                </div>
                <p className="text-white/50 text-sm mt-2">{c.note}</p>
                <a href={c.url} target="_blank" rel="noreferrer" className="label text-[#FF2A2A] hover:underline mt-4 inline-block">Open full size →</a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
