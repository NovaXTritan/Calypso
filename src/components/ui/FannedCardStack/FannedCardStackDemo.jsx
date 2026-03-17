/**
 * Demo component showcasing FannedCardStack usage
 * Import this in a page to test the component:
 *
 *   import FannedCardStackDemo from '@/components/ui/FannedCardStack/FannedCardStackDemo'
 *   <FannedCardStackDemo />
 */

import FannedCardStack from './FannedCardStack'

// Sample placeholder images (replace with actual images)
const sampleImages = [
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=250&fit=crop',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=250&fit=crop',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=250&fit=crop',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=250&fit=crop'
]

export default function FannedCardStackDemo() {
  return (
    <div className="p-8 min-h-screen bg-night-900">
      <h1 className="text-2xl font-bold text-white mb-8">FannedCardStack Demo</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* 2 cards */}
        <FannedCardStack
          images={sampleImages.slice(0, 2)}
          title="TODAY"
          subtitle="Daily Proofs"
          count={2}
          onClick={() => console.log('Clicked: 2 cards')}
        />

        {/* 3 cards with streak badge */}
        <FannedCardStack
          images={sampleImages.slice(0, 3)}
          title="THIS WEEK"
          subtitle="Submissions"
          count={7}
          badge="🔥 3"
          onClick={() => console.log('Clicked: 3 cards')}
        />

        {/* 4 cards */}
        <FannedCardStack
          images={sampleImages}
          title="ALL TIME"
          subtitle="Top Proofs"
          count={22}
          onClick={() => console.log('Clicked: 4 cards')}
        />

        {/* Empty state */}
        <FannedCardStack
          images={[]}
          title="PENDING"
          subtitle="No Proofs Yet"
          onClick={() => console.log('Clicked: empty')}
        />
      </div>

      <div className="mt-12">
        <h2 className="text-lg font-semibold text-white mb-4">Larger Layout</h2>
        <div className="max-w-xs">
          <FannedCardStack
            images={sampleImages.slice(0, 3)}
            title="FEATURED"
            subtitle="Pod Activity"
            count={15}
            badge="Active"
            className="w-full"
            onClick={() => console.log('Clicked: featured')}
          />
        </div>
      </div>
    </div>
  )
}
