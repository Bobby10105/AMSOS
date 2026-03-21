'use client';

import { LogOut, User as UserIcon, Settings } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function UserMenu({ user }: { user: { username: string; role: string } }) {
  const router = useRouter();

  const handleLogout = async () => {
    await fetch('/api/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  return (
    <div className="flex items-center space-x-6">
      <div className="flex items-center space-x-2 text-blue-100">
        <div className="bg-blue-800 p-1.5 rounded-full">
          <UserIcon className="h-4 w-4" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold leading-tight">{user.username}</span>
          <span className="text-[10px] uppercase tracking-widest opacity-70 leading-tight">{user.role}</span>
        </div>
      </div>
      
      <div className="flex items-center space-x-2">
        <Link
          href="/settings/password"
          className="flex items-center space-x-1.5 text-blue-200 hover:text-white text-sm font-medium transition-colors bg-blue-800/30 hover:bg-blue-800 px-3 py-1.5 rounded-md"
        >
          <Settings className="h-4 w-4" />
          <span>Password</span>
        </Link>
        <button
          onClick={handleLogout}
          className="flex items-center space-x-1.5 text-blue-200 hover:text-white text-sm font-medium transition-colors bg-blue-800/50 hover:bg-blue-800 px-3 py-1.5 rounded-md"
        >
          <LogOut className="h-4 w-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
}
