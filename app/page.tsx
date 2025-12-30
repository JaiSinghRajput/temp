'use client';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  return (
    <>
      <div className="p-10 text-center font-sans bg-gray-100 min-h-screen">
        <h1 className="text-5xl text-gray-800 mb-8">Welcome to Ecard Shop</h1>
        <div className="mt-8">
          <p className="text-xl text-gray-600 mb-5">Navigations:</p>
          <div className="flex justify-center gap-5 flex-wrap">
            <div>
              <p className="mb-2.5">Admin</p>
              <button onClick={() => router.push('/admin')} className="px-5 py-2.5 text-base bg-blue-500 text-white border-none rounded cursor-pointer hover:bg-blue-600">Go to Admin Page</button>
            </div>
            <div>
              <p className="mb-2.5">User</p>
              <button onClick={() => router.push('/user/templates')} className="px-5 py-2.5 text-base bg-green-500 text-white border-none rounded cursor-pointer hover:bg-green-600">Go to Shop Page</button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
