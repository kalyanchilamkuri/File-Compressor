import FileRow from './FileRow';
import type { Item } from './useCompressor';

interface Props {
  items: Item[];
  onRemove: (id: string) => void;
  onCancel: (id: string) => void;
  onRetry: (id: string, extra?: Item['extra']) => void;
  onCompare: (item: Item) => void;
  onOpenArchive: (item: Item) => void;
  nameFor: (item: Item) => string;
}

export default function FileList({ items, ...handlers }: Props) {
  if (!items.length) return null;
  return (
    <ul aria-label="Files" className="flex flex-col gap-2" data-testid="file-list">
      {items.map((item) => (
        <FileRow key={item.id} item={item} {...handlers} />
      ))}
    </ul>
  );
}
