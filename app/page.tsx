'use client';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h1 className="text-6xl font-bold text-gray-900 mb-6">
            Welcome to <span className="text-blue-600">E-Card Shop</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-10">
            Create beautiful, personalized e-cards in minutes. Choose from our professionally designed templates and customize them with your own message.
          </p>
          
          {/* CTA Buttons */}
          <div className="flex gap-6 justify-center mb-20">
            <button
              onClick={() => router.push('/templates')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl text-lg font-bold shadow-lg transition-all transform hover:scale-105"
            >
              🎨 Browse Templates
            </button>
            <button
              onClick={() => router.push('/admin/templates')}
              className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-4 rounded-xl text-lg font-bold shadow-lg transition-all transform hover:scale-105"
            >
              🔑 Admin Dashboard
            </button>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition">
            <div className="text-5xl mb-4">✨</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">Easy to Use</h3>
            <p className="text-gray-600">
              Simply select a template, customize the text, and download your personalized e-card in seconds.
            </p>
          </div>

          <div className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition">
            <div className="text-5xl mb-4">🎨</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">Beautiful Designs</h3>
            <p className="text-gray-600">
              Choose from a variety of professionally designed templates for any occasion.
            </p>
          </div>

          <div className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition">
            <div className="text-5xl mb-4">⚡</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">Instant Download</h3>
            <p className="text-gray-600">
              Download your customized e-card immediately as a high-quality PNG image.
            </p>
          </div>
        </div>

        {/* How It Works */}
        <div className="bg-white p-10 rounded-2xl shadow-xl">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-blue-600">1</span>
              </div>
              <h4 className="text-xl font-bold mb-2">Choose Template</h4>
              <p className="text-gray-600">Browse our collection and select your favorite design</p>
            </div>
            <div className="text-center">
              <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-purple-600">2</span>
              </div>
              <h4 className="text-xl font-bold mb-2">Customize Text</h4>
              <p className="text-gray-600">Add your personal message to the card</p>
            </div>
            <div className="text-center">
              <div className="bg-pink-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-pink-600">3</span>
              </div>
              <h4 className="text-xl font-bold mb-2">Download & Share</h4>
              <p className="text-gray-600">Download and share your beautiful e-card</p>
            </div>
          </div>
        </div>

        {/* Admin Section */}
        <div className="mt-16 bg-gradient-to-r from-purple-600 to-blue-600 p-10 rounded-2xl shadow-xl text-white">
          <div className="text-center">
            <h2 className="text-3xl font-bold mb-4">Admin Features</h2>
            <p className="text-lg mb-6 opacity-90">
              Create and manage professional e-card templates with our powerful admin tools
            </p>
            <ul className="text-left max-w-2xl mx-auto space-y-3 mb-8">
              <li className="flex items-center gap-3">
                <span className="text-2xl">✓</span>
                <span>Full canvas editor with custom fonts support</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="text-2xl">✓</span>
                <span>Upload and manage template images</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="text-2xl">✓</span>
                <span>Database-powered template storage</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="text-2xl">✓</span>
                <span>Edit and delete existing templates</span>
              </li>
            </ul>
            <button
              onClick={() => router.push('/admin/templates')}
              className="bg-white text-purple-600 px-8 py-3 rounded-xl font-bold shadow-lg hover:bg-gray-100 transition"
            >
              Access Admin Panel →
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t mt-20">
        <div className="max-w-7xl mx-auto px-6 py-8 text-center text-gray-600">
          <p>&copy; 2025 E-Card Shop. Create beautiful e-cards with ease.</p>
        </div>
      </footer>
    </div>
  );
}
