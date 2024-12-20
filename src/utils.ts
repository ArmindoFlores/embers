import { Item, isImage } from "@owlbear-rodeo/sdk";

export function getItemSize(item: Item) {
    const gridFactor = isImage(item) ? Math.max(item.image.width, item.image.height) / item.grid.dpi : 1;
    const scale = Math.max(item.scale.x, item.scale.y) * gridFactor;
    return scale;
}
