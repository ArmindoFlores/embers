import OBR, { Image } from "@owlbear-rodeo/sdk";

import { APP_KEY } from "./config";
import { MESSAGE_CHANNEL } from "./components/MessageListener";

export function setupContextMenu() {
    const id = `${APP_KEY}/context-menu`;

    OBR.contextMenu.create({
        id,
            icons: [
            {
                icon: "/icon.svg",
                label: "Cast spell from here",
                filter: {
                    min: 1,
                    max: 2,
                    every: [{ key: "layer", value: "CHARACTER" }, { key: "type", value: "IMAGE" }],
                },
            },
        ],
        onClick(context) {
            const selectedItems = context.items as Image[];
            const key = `${APP_KEY}/selected-spell`;

            OBR.player.getMetadata().then(metadata => {
                if (selectedItems.length == 1) {
                    OBR.broadcast.sendMessage(
                        MESSAGE_CHANNEL, 
                        {
                            instructions: [{
                                effectId: metadata?.[key],
                                effectInfo: {
                                    position: selectedItems[0].position
                                }
                            }]
                        },
                        { destination: "ALL" }
                    );
                }
                else {
                    const [sourceItem, destinationItem] = selectedItems;

                    OBR.broadcast.sendMessage(
                        MESSAGE_CHANNEL, 
                        {
                            instructions: [
                                {
                                    effectId: metadata?.[key],
                                    effectInfo: {
                                        copies: 1,
                                        source: sourceItem.position,
                                        destination: destinationItem.position
                                    },
                                }
                            ]
                        },
                        { destination: "ALL" }
                    );
                }
            });
        },
    });
}
