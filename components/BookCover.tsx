import Image from "next/image";

type BookCoverProps = {
  title: string;
  coverImage?: string | null;
  priority?: boolean;
  className?: string;
  imageClassName?: string;
};

export function BookCover({
  title,
  coverImage,
  priority = false,
  className = "",
  imageClassName = "",
}: BookCoverProps) {
  const wrapperClassName =
    className ||
    "relative flex aspect-[3/4] w-full items-center justify-center overflow-hidden rounded-[1.5rem] bg-gradient-to-br from-amber-100 via-stone-100 to-emerald-100 p-5 text-center text-sm font-semibold text-stone-700";

  if (!coverImage) {
    return <div className={wrapperClassName}>{title}</div>;
  }

  return (
    <div className={wrapperClassName}>
      <Image
        src={coverImage}
        alt={`Bìa sách ${title}`}
        fill
        priority={priority}
        sizes="(min-width: 1024px) 280px, (min-width: 640px) 220px, 35vw"
        className={`object-cover ${imageClassName}`}
      />
    </div>
  );
}
