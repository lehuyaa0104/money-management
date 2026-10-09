import { Plus, TrendingUp } from 'lucide-react'
import Button from '@/shared/ui/Button'
import Card from '@/shared/ui/Card'
import Text from '@/shared/ui/Text'

export default function AssetsEmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <Card className="flex flex-col items-center gap-2 py-10 text-center">
      <span className="grid size-14 place-items-center rounded-2xl bg-primary-soft text-primary">
        <TrendingUp className="size-7" />
      </span>
      <Text variant="subheading" as="p" className="mt-2">
        Chưa có tài sản nào
      </Text>
      <Text variant="caption" tone="muted" className="max-w-64">
        Thêm sổ tiết kiệm hoặc chứng chỉ quỹ để theo dõi tổng tài sản của bạn.
      </Text>
      <Button className="mt-4 h-12 w-auto px-6" onClick={onAdd}>
        <Plus className="size-5" /> Thêm tài sản
      </Button>
    </Card>
  )
}
