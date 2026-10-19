import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export interface PhotoSelectionnee {
  id: string;
  fichier: File;
  /** URL locale (URL.createObjectURL) pour la vignette */
  apercu: string;
  etat: 'compression' | 'prete';
  /** Compression impossible : l'original sera envoyé. */
  nonCompressee?: boolean;
}

function Vignette({
  photo,
  numero,
  onRetirer,
  desactive,
}: {
  photo: PhotoSelectionnee;
  numero: number;
  onRetirer: () => void;
  desactive: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: photo.id,
    disabled: desactive,
  });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`relative overflow-hidden rounded-lg border bg-white ${
        isDragging ? 'z-10 border-blue-700 shadow-lg' : 'border-slate-200'
      }`}
    >
      <div
        {...attributes}
        {...listeners}
        aria-label={`Page ${numero}, ${photo.fichier.name}. Appuyez sur Espace puis les flèches pour déplacer.`}
        className="block aspect-[3/4] cursor-grab touch-manipulation bg-slate-100 active:cursor-grabbing"
      >
        <img
          src={photo.apercu}
          alt=""
          draggable={false}
          className="h-full w-full object-cover select-none"
        />
        {photo.etat === 'compression' && (
          <span className="absolute inset-0 grid place-items-center bg-white/70 text-xs text-slate-700">
            Compression…
          </span>
        )}
      </div>
      <span className="absolute top-1 left-1 rounded bg-blue-900 px-1.5 py-0.5 text-xs font-semibold text-white">
        {numero}
      </span>
      <div className="flex items-center justify-between gap-1 px-2 py-1">
        <span className="truncate text-xs text-slate-500" title={photo.fichier.name}>
          {photo.nonCompressee ? 'Non compressée' : `${Math.round(photo.fichier.size / 1024)} Ko`}
        </span>
        <button
          type="button"
          onClick={onRetirer}
          disabled={desactive}
          aria-label={`Retirer la page ${numero}`}
          className="text-xs font-medium text-red-700 hover:underline disabled:opacity-50"
        >
          Retirer
        </button>
      </div>
    </li>
  );
}

/** Vignettes des pages à envoyer : l'ordre affiché est l'ordre des pages du cahier. */
export function VignettesTriables({
  photos,
  onChange,
  onRetirer,
  desactive = false,
}: {
  photos: PhotoSelectionnee[];
  onChange: (photos: PhotoSelectionnee[]) => void;
  onRetirer: (id: string) => void;
  desactive?: boolean;
}) {
  const capteurs = useSensors(
    // Souris : déplacement de 8 px avant de saisir, pour que les clics restent des clics.
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    // Doigt : appui long, pour ne pas gêner le défilement de la page.
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function finDeplacement({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    const depart = photos.findIndex((photo) => photo.id === active.id);
    const arrivee = photos.findIndex((photo) => photo.id === over.id);
    onChange(arrayMove(photos, depart, arrivee));
  }

  return (
    <DndContext sensors={capteurs} collisionDetection={closestCenter} onDragEnd={finDeplacement}>
      <SortableContext items={photos.map((photo) => photo.id)} strategy={rectSortingStrategy}>
        <ol className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {photos.map((photo, index) => (
            <Vignette
              key={photo.id}
              photo={photo}
              numero={index + 1}
              onRetirer={() => onRetirer(photo.id)}
              desactive={desactive}
            />
          ))}
        </ol>
      </SortableContext>
    </DndContext>
  );
}
