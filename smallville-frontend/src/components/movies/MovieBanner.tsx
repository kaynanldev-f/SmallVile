interface MovieBannerProps {
  bannerUrl: string;
}

export default function MovieBanner({ bannerUrl }: MovieBannerProps) {
  return (
    <div
      className="relative w-full h-[68vh] bg-cover bg-center bg-no-repeat rounded-b-3xl"
      style={{ backgroundImage: `url('${bannerUrl}')` }}
    >
      <div className="absolute inset-0 bg-linear-to-b from-deep-black/30 via-transparent to-deep-black" />
    </div>
  );
}
