'use client';

import clsx from 'clsx';
import { CardDraft } from './types';

interface Props {
  cards: CardDraft[];
  activeCardId: string;
  onSelect: (id: string) => void;
  onAdd: () => void;
}

export function CardSidebar({
  cards,
  activeCardId,
  onSelect,
  onAdd,
}: Props) {
  return (
    <aside className="w-64 border-r bg-white p-3 space-y-1">
      {cards.map((card, i) => (
        <button
          key={card.id}
          onClick={() => onSelect(card.id)}
          className={clsx(
            'w-full text-left px-3 py-2 rounded-md text-sm flex justify-between',
            activeCardId === card.id
              ? 'bg-primary/10 text-primary font-medium'
              : 'hover:bg-gray-100'
          )}
        >
          <span>Card {i + 1}</span>
          <span className="text-xs text-gray-500">
            {card.fields.length}
          </span>
        </button>
      ))}

      <button
        onClick={onAdd}
        className="w-full mt-3 py-2 text-sm border border-dashed rounded-md text-gray-600 hover:bg-gray-50"
      >
        + Add Card
      </button>
    </aside>
  );
}
