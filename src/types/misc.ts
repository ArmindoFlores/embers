import { Image, ImageDownload, Item } from "@owlbear-rodeo/sdk";

export interface SimplifiedItem {
    image: Image["image"];
    grid: Image["grid"];
    scale: Image["scale"];
    name: Item["name"];
    visible: Item["visible"];
    rotation: Item["rotation"];
    text: Image["text"];
    textItemType: Image["textItemType"];
    description?: Item["description"];
    locked: Item["locked"];
    type: ImageDownload["type"];
}
