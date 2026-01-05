import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { db } from '../lib/firebase'
import { collection, getDocs, doc, updateDoc, arrayUnion, arrayRemove, orderBy, query } from 'firebase/firestore'
import { Calendar, Clock, Users, MapPin, ExternalLink } from 'lucide-react'

export default function Events(){
  const { currentUser } = useAuth()
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchEvents()
  }, [])

  async function fetchEvents() {
    try {
      const q = query(collection(db, 'events'), orderBy('date', 'asc'))
      const snapshot = await getDocs(q)
      const eventsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      setEvents(eventsData)
    } catch (error) {
      console.error('Error fetching events:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleRSVP(eventId, isAttending) {
    if (!currentUser) return

    try {
      const eventRef = doc(db, 'events', eventId)
      
      if (isAttending) {
        // Remove from attendees
        await updateDoc(eventRef, {
          attendees: arrayRemove(currentUser.uid)
        })
      } else {
        // Add to attendees
        await updateDoc(eventRef, {
          attendees: arrayUnion(currentUser.uid)
        })
      }

      await fetchEvents()
    } catch (error) {
      console.error('Error updating RSVP:', error)
      alert('Failed to update RSVP')
    }
  }

  const now = Date.now()
  const upcomingEvents = events.filter(e => e.date > now)
  const pastEvents = events.filter(e => e.date <= now)

  if (loading) {
    return (
      <section className="mx-auto max-w-7xl px-4 py-12">
        <div className="text-zinc-400">Loading events...</div>
      </section>
    )
  }

  const EventCard = ({ event, isPast = false }) => {
    const isAttending = event.attendees?.includes(currentUser?.uid)
    const isFull = event.attendees?.length >= event.maxAttendees
    const eventDate = new Date(event.date)

    return (
      <div className={`glass p-5 rounded-2xl ${isPast ? 'opacity-60' : ''}`}>
        <div className="flex items-start justify-between mb-3">
          <h3 className="text-xl font-semibold">{event.title}</h3>
          {isAttending && !isPast && (
            <span className="px-3 py-1 rounded-full bg-green-400/20 text-green-400 text-xs">
              Attending
            </span>
          )}
        </div>

        <p className="text-zinc-300 mb-4">{event.description}</p>

        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-sm text-zinc-400">
            <Calendar size={16} />
            <span>{eventDate.toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}</span>
          </div>

          <div className="flex items-center gap-2 text-sm text-zinc-400">
            <Clock size={16} />
            <span>
              {eventDate.toLocaleTimeString('en-US', { 
                hour: '2-digit', 
                minute: '2-digit' 
              })} · {event.duration} minutes
            </span>
          </div>

          <div className="flex items-center gap-2 text-sm text-zinc-400">
            <Users size={16} />
            <span>
              {event.attendees?.length || 0} / {event.maxAttendees} attending
            </span>
          </div>

          {event.link && (
            <div className="flex items-center gap-2 text-sm text-brand-400">
              <MapPin size={16} />
              <a 
                href={event.link} 
                target="_blank" 
                rel="noopener noreferrer"
                className="hover:underline flex items-center gap-1"
              >
                Join Link
                <ExternalLink size={12} />
              </a>
            </div>
          )}
        </div>

        {!isPast && (
          <button
            onClick={() => handleRSVP(event.id, isAttending)}
            disabled={!isAttending && isFull}
            className={`w-full py-2 rounded-lg transition ${
              isAttending
                ? 'bg-white/10 border border-white/20 hover:bg-red-500/20 hover:border-red-500/20'
                : isFull
                ? 'bg-white/5 border border-white/10 opacity-50 cursor-not-allowed'
                : 'btn-primary'
            }`}
          >
            {isAttending ? 'Cancel RSVP' : isFull ? 'Event Full' : 'RSVP'}
          </button>
        )}
      </div>
    )
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-12">
      <h2 className="text-3xl font-bold mb-6">Community Events</h2>
      <p className="text-zinc-300 mb-8">Join live sessions, workshops, and community calls</p>

      {/* Upcoming Events */}
      <div className="mb-12">
        <h3 className="text-2xl font-semibold mb-4">Upcoming Events</h3>
        {upcomingEvents.length === 0 ? (
          <div className="glass p-8 rounded-2xl text-center text-zinc-400">
            No upcoming events scheduled
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {upcomingEvents.map(event => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </div>

      {/* Past Events */}
      {pastEvents.length > 0 && (
        <div>
          <h3 className="text-2xl font-semibold mb-4">Past Events</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {pastEvents.map(event => (
              <EventCard key={event.id} event={event} isPast />
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
