import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { Plus, Sparkles, Tag, Trash2 } from 'lucide-react'
import type { TransactionType } from '@/features/transactions/types'
import { ApiError } from '@/shared/api/apiClient'
import PageHeader from '@/shared/layout/PageHeader'
import Alert from '@/shared/ui/Alert'
import Button from '@/shared/ui/Button'
import Card from '@/shared/ui/Card'
import ConfirmDialog from '@/shared/ui/ConfirmDialog'
import SegmentedControl from '@/shared/ui/SegmentedControl'
import Text from '@/shared/ui/Text'
import CategoryTile from '../components/CategoryTile'
import type { Category } from '../types'
import { useCategories } from '../useCategories'

type Notice = { tone: 'info' | 'error'; text: string }

export default function CategoriesPage() {
  const categories = useCategories()
  const [params, setParams] = useSearchParams()
  const [notice, setNotice] = useState<Notice | null>(null)
  const [addingDefaults, setAddingDefaults] = useState(false)
  const [deleting, setDeleting] = useState<Category | null>(null)

  // The selected tab lives in the URL so "back" from the create page returns to it.
  const type: TransactionType = params.get('type') === 'income' ? 'income' : 'expense'
  const count = (t: TransactionType) => categories.categories.filter((c) => c.type === t).length
  const visible = categories.categories.filter((c) => c.type === type)

  const addDefaults = async () => {
    setAddingDefaults(true)
    setNotice(null)
    try {
      const created = await categories.addDefaults()
      setNotice({
        tone: 'info',
        text: created > 0 ? `Đã thêm ${created} danh mục mặc định.` : 'Bạn đã có đủ các danh mục mặc định.',
      })
    } catch (err) {
      setNotice({ tone: 'error', text: err instanceof ApiError ? err.message : 'Đã có lỗi xảy ra, vui lòng thử lại' })
    } finally {
      setAddingDefaults(false)
    }
  }

  const addDefaultsLabel = addingDefaults ? 'Đang thêm…' : 'Thêm danh mục mặc định'

  // Errors are shown inside the dialog (ConfirmDialog catches them), so it stays open on failure.
  const confirmDelete = async (category: Category) => {
    await categories.remove(category.id)
    setDeleting(null)
    setNotice({ tone: 'info', text: `Đã xoá danh mục “${category.name}”.` })
  }

  return (
    <div className="pb-safe mx-auto min-h-dvh max-w-120 bg-gray-50">
      <PageHeader
        title="Danh mục"
        back
        centered
        fallback="/profile"
        action={
          <Link
            to={`/categories/new?type=${type}`}
            aria-label="Tạo danh mục"
            className="grid size-11 shrink-0 place-items-center rounded-full bg-primary-soft text-primary active:bg-green-200"
          >
            <Plus className="size-5" />
          </Link>
        }
      />

      <main className="flex flex-col gap-4 px-5 pt-2 pb-6">
        {categories.status === 'loading' && categories.categories.length === 0 ? (
          <Card>
            <Text tone="muted" className="py-8 text-center">
              Đang tải danh mục…
            </Text>
          </Card>
        ) : categories.status === 'error' ? (
          <Card className="flex flex-col items-center gap-4 py-8 text-center">
            <Text tone="danger">{categories.error}</Text>
            <Button variant="outline" className="h-11 w-auto px-6" onClick={categories.retry}>
              Thử lại
            </Button>
          </Card>
        ) : categories.categories.length === 0 ? (
          <Card className="flex flex-col items-center gap-2 py-8 text-center">
            <span className="grid size-14 place-items-center rounded-2xl bg-primary-soft text-primary">
              <Tag className="size-7" />
            </span>
            <Text as="p" variant="subheading" className="mt-2">
              Chưa có danh mục nào
            </Text>
            <Text variant="caption" tone="muted" className="max-w-64">
              Thêm nhanh các danh mục phổ biến như Ăn uống, Di chuyển, Lương… hoặc tự tạo danh mục của bạn.
            </Text>
            {notice && <Alert tone={notice.tone}>{notice.text}</Alert>}
            <Button className="mt-4 h-12 w-auto px-6" onClick={addDefaults} disabled={addingDefaults}>
              <Sparkles className="size-5" /> {addingDefaults ? 'Đang thêm…' : 'Tạo danh mục mặc định'}
            </Button>
            <Link to={`/categories/new?type=${type}`} className="mt-2 text-sm font-bold text-primary">
              Tự tạo danh mục
            </Link>
          </Card>
        ) : (
          <>
            <SegmentedControl
              label="Loại danh mục"
              value={type}
              onChange={(t) => setParams({ type: t }, { replace: true })}
              options={[
                { value: 'expense', label: `Chi tiêu (${count('expense')})`, activeClass: 'text-red-600' },
                { value: 'income', label: `Thu nhập (${count('income')})`, activeClass: 'text-primary' },
              ]}
            />

            {visible.length > 0 ? (
              <Card className="px-3 py-1">
                <ul className="divide-y divide-gray-100">
                  {visible.map((c) => (
                    <li key={c.id} className="flex items-center gap-4 py-3 pr-1 pl-2">
                      <CategoryTile icon={c.icon} color={c.color} />
                      <Text as="span" weight="semibold" className="min-w-0 flex-1 truncate">
                        {c.name}
                      </Text>
                      <button
                        type="button"
                        onClick={() => setDeleting(c)}
                        aria-label={`Xoá danh mục ${c.name}`}
                        className="grid size-10 shrink-0 place-items-center rounded-full text-gray-400 active:bg-red-50 active:text-red-600"
                      >
                        <Trash2 className="size-5" />
                      </button>
                    </li>
                  ))}
                </ul>
              </Card>
            ) : (
              <Card>
                <Text tone="muted" className="py-6 text-center">
                  Chưa có danh mục {type === 'income' ? 'thu nhập' : 'chi tiêu'}.
                </Text>
              </Card>
            )}

            {notice && <Alert tone={notice.tone}>{notice.text}</Alert>}
            <Button variant="outline" onClick={addDefaults} disabled={addingDefaults}>
              <Sparkles className="size-5" /> {addDefaultsLabel}
            </Button>
          </>
        )}
      </main>

      {deleting && (
        <ConfirmDialog
          title="Xoá danh mục?"
          message={
            <>
              Danh mục “{deleting.name}” sẽ bị xoá, kèm ngân sách của nó (nếu có). Các giao dịch đã ghi với danh mục
              này vẫn được giữ, nhưng sẽ hiển thị là danh mục không xác định.
            </>
          }
          confirmLabel="Xoá"
          onConfirm={() => confirmDelete(deleting)}
          onClose={() => setDeleting(null)}
        />
      )}
    </div>
  )
}
