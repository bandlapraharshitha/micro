import Sidebar from '@/components/Sidebar';
import './globals.css';

export const metadata = {
  title: 'Huffman-Compressed Micro-Architecture Instruction Memory Simulator',
  description:
    'Multidisciplinary research lab bridging DAA (Huffman Compression), FLAT (Formal Automata & DFA Decoders), and COA (Microprogrammed Control Memory).',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark h-full" style={{ backgroundColor: '#020617', color: '#f8fafc' }}>
      <body
        className="min-h-screen bg-[#020617] text-slate-100 flex antialiased selection:bg-cyan-500 selection:text-black"
        style={{ backgroundColor: '#020617', color: '#f8fafc' }}
      >
        {/* Persistent Navigation Sidebar */}
        <Sidebar />

        {/* Main Content Area */}
        <div
          className="flex-1 lg:pl-64 flex flex-col min-w-0 min-h-screen bg-[#020617]"
          style={{ backgroundColor: '#020617' }}
        >
          <main
            className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto bg-[#020617]"
            style={{ backgroundColor: '#020617' }}
          >
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
