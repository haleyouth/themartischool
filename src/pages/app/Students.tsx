import { motion } from 'framer-motion'
import { GraduationCap, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Avatar } from '@/components/ui/Avatar'
import { Badge, statusTone } from '@/components/ui/Badge'
import { Card, CardBody } from '@/components/ui/Card'
import { EmptyState, TableSkeleton } from '@/components/ui/Feedback'
import { Input } from '@/components/ui/Input'
import { useI18n } from '@/i18n'
import { useStudents } from '@/lib/hooks'
import { fullName, percent } from '@/lib/utils'

export default function Students() {
  const { t } = useI18n()
  const [search, setSearch] = useState('')
  const { data: students, loading } = useStudents()

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return students
    return students.filter(
      (student) =>
        `${student.firstName} ${student.lastName}`.toLowerCase().includes(term) ||
        student.studentId.toLowerCase().includes(term),
    )
  }, [students, search])

  return (
    <>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-950">{t('students.title')}</h1>
          <p className="mt-1.5 text-sm text-ink-600">{t('students.subtitle')}</p>
        </div>
        <Input
          placeholder={t('students.searchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          leftIcon={<Search className="h-4 w-4" />}
          wrapperClassName="w-full sm:w-72"
        />
      </div>

      <Card>
        <CardBody className="p-0">
          {loading ? (
            <div className="p-5">
              <TableSkeleton rows={6} cols={5} />
            </div>
          ) : visible.length === 0 ? (
            <EmptyState
              className="m-5 border-0 bg-transparent"
              icon={<GraduationCap className="h-6 w-6" />}
              title={t('students.noStudents')}
              description={t('students.noStudentsBody')}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-cream-200 text-left text-xs uppercase tracking-wider text-ink-500">
                    <th className="px-5 py-3 font-semibold">{t('common.name')}</th>
                    <th className="px-5 py-3 font-semibold">{t('students.studentId')}</th>
                    <th className="px-5 py-3 font-semibold">{t('students.gradeLevel')}</th>
                    <th className="px-5 py-3 font-semibold">{t('students.attendanceRate')}</th>
                    <th className="px-5 py-3 font-semibold">{t('common.status')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cream-200">
                  {visible.map((student, index) => {
                    const summary = student.attendanceSummary
                    const rate = summary?.totalSessions
                      ? percent(summary.present + summary.late, summary.totalSessions)
                      : null

                    return (
                      <motion.tr
                        key={student.studentId}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(index * 0.02, 0.25) }}
                        className="transition-colors hover:bg-cream-100"
                      >
                        <td className="px-5 py-3.5">
                          <Link
                            to={`/app/students/${student.studentId}`}
                            className="flex items-center gap-3 group"
                          >
                            <Avatar
                              name={fullName(student.firstName, student.lastName)}
                              size="sm"
                            />
                            <span className="font-semibold text-ink-900 transition-colors group-hover:text-marti-700">
                              {fullName(
                                student.firstName,
                                student.lastName,
                                student.preferredName,
                              )}
                            </span>
                          </Link>
                        </td>
                        <td className="px-5 py-3.5 font-mono text-xs text-ink-600">
                          {student.studentId}
                        </td>
                        <td className="px-5 py-3.5 text-ink-600">{student.gradeLevel}</td>
                        <td className="px-5 py-3.5">
                          {rate === null ? (
                            <span className="text-xs text-ink-400">-</span>
                          ) : (
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 w-16 overflow-hidden rounded-full bg-ink-100">
                                <div
                                  className={`h-full rounded-full ${
                                    rate >= 90
                                      ? 'bg-mint-500'
                                      : rate >= 75
                                        ? 'bg-sunshine-500'
                                        : 'bg-coral-500'
                                  }`}
                                  style={{ width: `${rate}%` }}
                                />
                              </div>
                              <span className="text-xs font-medium text-ink-700">{rate}%</span>
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          <Badge tone={statusTone(student.enrollmentStatus)} size="sm">
                            {t(`students.status${cap(student.enrollmentStatus)}`)}
                          </Badge>
                        </td>
                      </motion.tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
    </>
  )
}

function cap(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}
