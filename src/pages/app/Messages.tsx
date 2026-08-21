import { AnimatePresence, motion } from 'framer-motion'
import { httpsCallable } from 'firebase/functions'
import {
  addDoc,
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore'
import { Lock, Megaphone, MessageSquare, PenSquare, Search, Send } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { EmptyState, Spinner } from '@/components/ui/Feedback'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import { isAdminRole, useAuth } from '@/contexts/AuthContext'
import { useI18n } from '@/i18n'
import { db, functions } from '@/lib/firebase'
import { groupContacts, useContacts } from '@/lib/contacts'
import { useClasses, useConversations } from '@/lib/hooks'
import { cn, formatRelative, truncate } from '@/lib/utils'
import type { ConversationDoc, MessageDoc } from '@/types/models'

export default function Messages() {
  const { t } = useI18n()
  const auth = useAuth()
  const toast = useToast()
  const uid = auth.user?.uid ?? ''

  const { data: conversations, loading } = useConversations(uid)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [messages, setMessages] = useState<MessageDoc[]>([])
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [search, setSearch] = useState('')
  const [picking, setPicking] = useState(false)
  const [broadcasting, setBroadcasting] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const active = conversations.find((conv) => conv.id === activeId) ?? null

  // Select the most recent thread once conversations load.
  useEffect(() => {
    if (!activeId && conversations.length) setActiveId(conversations[0].id)
  }, [conversations, activeId])

  // Subscribe to the open thread's messages.
  useEffect(() => {
    if (!activeId) {
      setMessages([])
      return
    }
    setLoadingMessages(true)

    const unsubscribe = onSnapshot(
      query(
        collection(db, 'conversations', activeId, 'messages'),
        orderBy('sentAt', 'asc'),
        limit(200),
      ),
      (snapshot) => {
        setMessages(
          snapshot.docs.map((docSnap) => ({ ...(docSnap.data() as MessageDoc), id: docSnap.id })),
        )
        setLoadingMessages(false)
      },
      (error) => {
        console.error('Messages subscription failed', error)
        setLoadingMessages(false)
      },
    )

    return unsubscribe
  }, [activeId])

  // Keep the newest message in view.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages])

  // Clear this user's unread count when they open a thread.
  useEffect(() => {
    if (!active || !uid) return
    if (!active.unreadCounts?.[uid]) return

    void updateDoc(doc(db, 'conversations', active.id), {
      [`unreadCounts.${uid}`]: 0,
      [`readAt.${uid}`]: serverTimestamp(),
    }).catch((error) => console.error('Mark read failed', error))
  }, [active, uid])

  async function send() {
    const text = draft.trim()
    if (!text || !active || !uid) return

    setSending(true)
    try {
      await addDoc(collection(db, 'conversations', active.id, 'messages'), {
        conversationId: active.id,
        senderId: uid,
        senderName: auth.profile?.displayName ?? '',
        senderRole: auth.role ?? 'student',
        text,
        attachments: [],
        sentAt: serverTimestamp(),
        editedAt: null,
        deletedAt: null,
        readBy: [uid],
      })
      setDraft('')
    } catch (error) {
      console.error('Send failed', error)
      toast.error(t('common.error'), (error as Error)?.message)
    } finally {
      setSending(false)
    }
  }

  const visible = conversations.filter((conv) => {
    const term = search.trim().toLowerCase()
    if (!term) return true
    return (
      conv.title?.toLowerCase().includes(term) ||
      Object.values(conv.participantNames ?? {}).some((name) =>
        name.toLowerCase().includes(term),
      )
    )
  })

  return (
    <>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">{t('messages.title')}</h1>
          <p className="mt-1.5 text-sm text-ink-600">{t('messages.subtitle')}</p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          {isAdminRole(auth.role) && (
            <Button
              variant="outline"
              onClick={() => setBroadcasting(true)}
              leftIcon={<Megaphone className="h-4 w-4" />}
            >
              {t('messages.broadcast')}
            </Button>
          )}
          <Button
            onClick={() => setPicking(true)}
            leftIcon={<PenSquare className="h-4 w-4" />}
          >
            {t('messages.newConversation')}
          </Button>
        </div>
      </div>

      <Card className="grid h-[calc(100vh-14rem)] min-h-[32rem] grid-cols-1 overflow-hidden lg:grid-cols-[20rem_1fr]">
        {/* Thread list */}
        <div
          className={cn(
            'flex flex-col border-ink-200 lg:border-r',
            activeId && 'hidden lg:flex',
          )}
        >
          <div className="border-b border-ink-200 p-3">
            <Input
              placeholder={t('messages.searchConversations')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftIcon={<Search className="h-4 w-4" />}
            />
          </div>

          <div className="scrollbar-thin flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex justify-center py-10">
                <Spinner />
              </div>
            ) : visible.length === 0 ? (
              <EmptyState
                className="m-3 border-0 bg-transparent py-10"
                icon={<MessageSquare className="h-5 w-5" />}
                title={t('messages.noConversations')}
                description={t('messages.noConversationsBody')}
              />
            ) : (
              <ul className="divide-y divide-ink-100">
                {visible.map((conv) => (
                  <li key={conv.id}>
                    <button
                      type="button"
                      onClick={() => setActiveId(conv.id)}
                      className={cn(
                        'flex w-full gap-3 px-4 py-3.5 text-left transition-colors hover:bg-cream-200',
                        activeId === conv.id && 'bg-marti-50',
                      )}
                    >
                      <Avatar name={conversationTitle(conv, uid)} size="sm" />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-semibold text-ink">
                            {conversationTitle(conv, uid)}
                          </span>
                          {(conv.unreadCounts?.[uid] ?? 0) > 0 && (
                            <Badge tone="danger" size="sm">
                              {conv.unreadCounts[uid]}
                            </Badge>
                          )}
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-ink-500">
                          {conv.lastMessage ? truncate(conv.lastMessage.text, 46) : '-'}
                        </span>
                        <span className="mt-0.5 block text-[11px] text-ink-400">
                          {formatRelative(conv.lastMessageAt)}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Thread */}
        <div className={cn('flex min-w-0 flex-col', !activeId && 'hidden lg:flex')}>
          {!active ? (
            <div className="flex flex-1 items-center justify-center p-8">
              <EmptyState
                className="border-0 bg-transparent"
                icon={<MessageSquare className="h-6 w-6" />}
                title={t('messages.selectConversation')}
                description={t('messages.selectConversationBody')}
              />
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 border-b border-ink-200 px-5 py-3.5">
                <button
                  type="button"
                  onClick={() => setActiveId(null)}
                  className="text-sm text-marti-600 lg:hidden"
                >
                  {t('common.back')}
                </button>
                <Avatar name={conversationTitle(active, uid)} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-ink">
                    {conversationTitle(active, uid)}
                  </p>
                  <p className="text-xs text-ink-500">
                    {active.participantIds.length} {t('messages.recipients')}
                  </p>
                </div>
                {active.isLocked && (
                  <Badge tone="neutral" size="sm">
                    <Lock className="h-3 w-3" />
                    {t('messages.announcement')}
                  </Badge>
                )}
              </div>

              <div className="scrollbar-thin flex-1 space-y-3 overflow-y-auto bg-cream-200/40 p-5">
                {loadingMessages ? (
                  <div className="flex justify-center py-10">
                    <Spinner />
                  </div>
                ) : (
                  <AnimatePresence initial={false}>
                    {messages.map((message) => {
                      const mine = message.senderId === uid
                      return (
                        <motion.div
                          key={message.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2 }}
                          className={cn('flex gap-2.5', mine && 'flex-row-reverse')}
                        >
                          {!mine && <Avatar name={message.senderName} size="xs" />}
                          <div className={cn('max-w-[75%]', mine && 'items-end')}>
                            {!mine && (
                              <p className="mb-1 text-[11px] font-medium text-ink-500">
                                {message.senderName}
                              </p>
                            )}
                            <div
                              className={cn(
                                'rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
                                mine
                                  ? 'rounded-br-md bg-marti-600 text-white'
                                  : 'rounded-bl-md border-2 border-ink bg-white text-ink-800',
                              )}
                            >
                              {message.deletedAt ? (
                                <em className="opacity-60">{t('messages.deleted')}</em>
                              ) : (
                                message.text
                              )}
                            </div>
                            <p
                              className={cn(
                                'mt-1 text-[11px] text-ink-400',
                                mine && 'text-right',
                              )}
                            >
                              {formatRelative(message.sentAt)}
                            </p>
                          </div>
                        </motion.div>
                      )
                    })}
                  </AnimatePresence>
                )}
                <div ref={bottomRef} />
              </div>

              {active.isLocked ? (
                <p className="border-t border-ink-200 px-5 py-4 text-center text-xs text-ink-500">
                  {t('messages.locked')}
                </p>
              ) : (
                <form
                  onSubmit={(event) => {
                    event.preventDefault()
                    void send()
                  }}
                  className="flex items-end gap-2.5 border-t border-ink-200 p-4"
                >
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(event) => {
                      // Enter sends; Shift+Enter starts a new line.
                      if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault()
                        void send()
                      }
                    }}
                    rows={1}
                    placeholder={t('messages.typeMessage')}
                    maxLength={5000}
                    className="scrollbar-thin max-h-32 min-h-[2.75rem] flex-1 resize-none rounded-xl border border-ink-200 px-3.5 py-3 text-sm transition-all focus:border-marti-500 focus:outline-none focus:ring-4 focus:ring-marti-500/10"
                  />
                  <Button
                    type="submit"
                    size="icon"
                    loading={sending}
                    disabled={!draft.trim()}
                    aria-label={t('messages.send')}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              )}
            </>
          )}
        </div>
      </Card>

      <NewConversationModal
        open={picking}
        onClose={() => setPicking(false)}
        onCreated={(id) => {
          setPicking(false)
          setActiveId(id)
        }}
      />

      <BroadcastModal open={broadcasting} onClose={() => setBroadcasting(false)} />
    </>
  )
}

/** A direct thread is named after the other person, not the signed-in user. */
function conversationTitle(conv: ConversationDoc, uid: string): string {
  if (conv.title) return conv.title
  const others = Object.entries(conv.participantNames ?? {})
    .filter(([id]) => id !== uid)
    .map(([, name]) => name)
  return others.join(', ') || '-'
}


/**
 * The directory of people this user is allowed to message.
 *
 * The list comes from useContacts, which mirrors the policy createConversation
 * enforces server-side, so nobody is offered a contact the server would refuse.
 */
function NewConversationModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  onCreated: (conversationId: string) => void
}) {
  const { t } = useI18n()
  const toast = useToast()
  const { contacts, loading } = useContacts()
  const [search, setSearch] = useState('')
  const [busy, setBusy] = useState<string | null>(null)

  const groups = groupContacts(
    contacts.filter((c) => {
      const term = search.trim().toLowerCase()
      if (!term) return true
      return c.displayName.toLowerCase().includes(term) || c.subtitle.toLowerCase().includes(term)
    }),
  )

  async function start(contactUid: string) {
    setBusy(contactUid)
    try {
      const result = await httpsCallable<
        { participantIds: string[]; type: 'direct' },
        { conversationId: string }
      >(functions, 'createConversation')({ participantIds: [contactUid], type: 'direct' })
      onCreated(result.data.conversationId)
      setSearch('')
    } catch (error) {
      console.error('createConversation failed', error)
      toast.error(t('common.error'), (error as Error)?.message)
    } finally {
      setBusy(null)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={t('messages.directory')} size="lg">
      <div className="space-y-4">
        <Input
          placeholder={t('messages.searchPeople')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          leftIcon={<Search className="h-4 w-4" />}
        />

        {loading ? (
          <div className="flex justify-center py-10">
            <Spinner />
          </div>
        ) : groups.length === 0 ? (
          <EmptyState
            className="border-0 bg-transparent py-8"
            icon={<MessageSquare className="h-5 w-5" />}
            title={t('messages.directoryEmpty')}
          />
        ) : (
          <div className="scrollbar-thin max-h-96 space-y-5 overflow-y-auto pr-1">
            {groups.map((group) => (
              <div key={group.role}>
                <p className="text-[11px] font-extrabold uppercase tracking-wide text-ink-400">
                  {t(`staff.role${group.role.charAt(0).toUpperCase()}${group.role.slice(1)}`)}
                </p>
                <ul className="mt-2 space-y-2">
                  {group.people.map((person) => (
                    <li
                      key={person.uid}
                      className="flex items-center justify-between gap-3 rounded-2xl border-2 border-ink-100 px-4 py-2.5"
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <Avatar name={person.displayName} size="sm" />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-bold text-ink">
                            {person.displayName}
                          </span>
                          {/*
                            A student account is the family account, so name
                            the guardian who will actually read this.
                          */}
                          <span className="block truncate text-xs text-ink-500">
                            {person.role === 'student' && person.subtitle
                              ? `${t('messages.parentOf')} ${person.subtitle}`
                              : person.subtitle}
                          </span>
                        </span>
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        loading={busy === person.uid}
                        disabled={busy !== null}
                        onClick={() => start(person.uid)}
                      >
                        {t('messages.startWith')}
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  )
}

/** Announcement to everyone, or to a single class. Admins only. */
function BroadcastModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useI18n()
  const toast = useToast()
  const { data: classes } = useClasses()

  const [scope, setScope] = useState<'school' | 'class'>('school')
  const [classId, setClassId] = useState('')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)

  async function send() {
    setBusy(true)
    try {
      const result = await httpsCallable<
        { scope: 'school' | 'class'; classId?: string; title: string; body: string },
        { recipients: number }
      >(
        functions,
        'sendAnnouncement',
      )({
        scope,
        ...(scope === 'class' ? { classId } : {}),
        title: title.trim(),
        body: body.trim(),
      })
      toast.success(t('messages.broadcastSent', { count: String(result.data.recipients ?? 0) }))
      setTitle('')
      setBody('')
      onClose()
    } catch (error) {
      console.error('sendAnnouncement failed', error)
      toast.error(t('common.error'), (error as Error)?.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('messages.broadcastTitle')}
      description={t('messages.broadcastBody')}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            {t('common.cancel')}
          </Button>
          <Button
            onClick={send}
            loading={busy}
            disabled={!title.trim() || !body.trim() || (scope === 'class' && !classId)}
            leftIcon={<Megaphone className="h-4 w-4" />}
          >
            {t('messages.broadcastSend')}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <Select
          label={t('messages.announcementScope')}
          value={scope}
          onChange={(e) => setScope(e.target.value as 'school' | 'class')}
          options={[
            { value: 'school', label: t('messages.broadcastScopeSchool') },
            { value: 'class', label: t('messages.broadcastScopeClass') },
          ]}
        />

        {scope === 'class' && (
          <Select
            label={t('classes.className')}
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
          >
            <option value="">{t('common.none')}</option>
            {classes
              .filter((c) => c.status === 'active')
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
          </Select>
        )}

        <Input
          label={t('messages.broadcastSubject')}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={120}
          required
        />
        <Textarea
          label={t('messages.broadcastMessage')}
          rows={5}
          maxLength={2000}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          required
        />
      </div>
    </Modal>
  )
}
