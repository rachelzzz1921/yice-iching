import { SITE_NAME } from "@/lib/brand";
import { TaijiMark } from "@/components/home/TaijiMark";

const NAME_CHARS = SITE_NAME.split("");

/** 首页主视觉：低透明度太极衬底 + 品牌名 */
export function HomeHeroMark() {
  return (
    <div className="home-hero-mark" aria-hidden>
      <div className="home-hero-taiji-layer">
        <span className="home-hero-taiji-halo home-hero-taiji-halo--outer" />
        <span className="home-hero-taiji-halo home-hero-taiji-halo--inner" />
        <div className="home-hero-taiji-orbit">
          <div className="home-hero-taiji-spin">
            <TaijiMark className="home-hero-taiji" />
          </div>
        </div>
      </div>
      <p className="home-hero-name font-serif-cjk" translate="no">
        {NAME_CHARS.map((char, i) => (
          <span
            key={`${char}-${i}`}
            className="home-hero-name-char-wrap"
            style={{ animationDelay: `${1.05 + i * 0.22}s` }}
          >
            <span
              className="home-hero-name-char"
              style={{ animationDelay: `${0.22 + i * 0.14}s` }}
            >
              {char}
            </span>
          </span>
        ))}
      </p>
    </div>
  );
}
