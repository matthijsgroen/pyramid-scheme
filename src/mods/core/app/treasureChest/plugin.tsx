import clsx from "clsx"
import { useState } from "react"
import { createPortal } from "react-dom"
import { useTranslation } from "react-i18next"
import { registerFamily, type FamilyPlugin } from "@/app/families/familyRegistry"
import { getRewardHandler } from "@/app/SiteMap/rewardHandlerRegistry"
import { ART_IMAGE_RENDERING, CHEST_TILE, chestTileUrl } from "@/app/SiteMap/tileAssets"
import { TREASURE_CHEST_META } from "@/mods/core/game/treasureChest/meta"

// A treasure chest is an encounter with zero challenge and zero fail cost — clicking it IS
// solving it. Core's own RewardFlow takes over from there (reveal + grant); this family only
// owns the chest visual and the click gesture.
//
// The chest is its own full-screen layer, prompt and all, so it is drawn on the page rather than in the
// encounter frame: there it would leave the frame with nothing in its flow, and an empty-looking frame draws
// its padding as a bar behind the chest. Portalled out, the frame holds nothing and draws nothing.
//
// It is the map's own chest, painted at the room's rank: the same drawing the player walked up to, shut until
// tapped and then open (`chestChain`), and a reward with a chest of its own (a ward key's) shows that one.
export const TreasureComponent: FamilyPlugin["Component"] = ({ ctx, onSolved }) => {
  const { t } = useTranslation("common")
  const [opened, setOpened] = useState(false)

  const handleOpen = () => {
    if (opened) return
    setOpened(true)
    // The light behind the chest grows in 500ms; a moment of its glow is seen before RewardFlow takes over.
    setTimeout(onSolved, 1100)
  }

  const art = ctx.reward ? getRewardHandler(ctx.reward.type)?.art?.(ctx.reward) : undefined
  // A chest of its own (a ward key's) opens in the ward's light, any other in torchlight.
  const ownChest = art?.kind === "chest"
  const tile = ownChest ? art.tile : CHEST_TILE
  // A tileset that is no rank (the cave) has no chest of its own, as on the map: the rank's is drawn.
  const rank = ctx.difficulty ?? "starter"
  const url = chestTileUrl(ctx.tileset ?? rank, rank, tile, opened)
  const label = t("chest.tapToOpen")

  return createPortal(
    <div className="fixed inset-0 z-30 flex flex-col items-center justify-center bg-black/85">
      <button
        type="button"
        aria-label={label}
        disabled={opened}
        onClick={handleOpen}
        className={clsx(
          "relative motion-safe:transition-transform",
          opened ? "cursor-default" : "cursor-pointer motion-safe:hover:scale-105"
        )}
      >
        {opened && (
          <div
            data-testid="chest-glow"
            className={clsx(
              "absolute -inset-16 animate-chest-glow rounded-full motion-reduce:animate-none",
              ownChest
                ? "bg-[radial-gradient(circle,var(--color-ward-light)_0%,transparent_65%)]"
                : "bg-[radial-gradient(circle,var(--color-ember-300)_0%,transparent_65%)]"
            )}
          />
        )}
        <img
          src={url}
          alt=""
          draggable={false}
          className="relative w-48"
          style={{ imageRendering: ART_IMAGE_RENDERING }}
        />
      </button>
      {/* Kept in the layout once open, so the centred chest does not jump down. */}
      <p
        aria-hidden={opened}
        className={clsx("mt-6 text-sm text-amber-300", opened ? "invisible" : "motion-safe:animate-pulse")}
      >
        {label}
      </p>
    </div>,
    document.body
  )
}

registerFamily({
  meta: TREASURE_CHEST_META,
  generate: () => undefined,
  Component: TreasureComponent,
})
