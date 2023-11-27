import {hmNode} from "./hm";

export type ApiResultLocusRelationsHeaders = Array<string>

export type ApiResultLocusRelationsRelation = Array<any>

export interface ApiResultLocusRelations {
    result: Boolean
    headers: ApiResultLocusRelationsHeaders
    relations: Array<ApiResultLocusRelationsRelation>
}

export function api2HmNodes(apiData: ApiResultLocusRelations) {
    const nodes: Map<string, hmNode> = new Map()
    const locusIdFieldIdx = apiData.headers.findIndex(x => x === "arch_context")
    const locusUIDFieldIdx = apiData.headers.findIndex(x => x === "uid")
    const chronFieldIdx = apiData.headers.findIndex(x => x === "chronology")
    const relationTypeFieldIdx = apiData.headers.findIndex(x => x === "relation_type")
    const relatedLocusIdx = apiData.headers.findIndex(x => x === "uid_locus_2_related")

    for (const apiRecord of apiData.relations) {
        const locusUID = apiRecord[locusUIDFieldIdx]
        let chronType = ""
        try {
            chronType = apiRecord[chronFieldIdx].toLowerCase()
        } catch (e) {

            switch (apiRecord[relationTypeFieldIdx]) {
                case "abuts": chronType = "later";break;
                case "cuts through": chronType = "later";break;
                case "cut": chronType = "earlier";break;
                case "cut by": chronType = "earlier";break;
                case "above": chronType = "later";break;
                case "below": chronType = "earlier";break;
                case "bonds with": chronType = "same time as";break;
                case "is abutted by": chronType = "earlier";break;
                case "is adjacent to": chronType = "same time as";break;
                default: console.error(`Can't read chron type for locus ${locusUID}. And I don't understand the relation type ${apiRecord[relationTypeFieldIdx]}`)
            }
        }
        let node = nodes.get(locusUID)
        if (!node) {
            node = new hmNode(locusUID, [],[])
            node.name = apiRecord[locusIdFieldIdx]
            node.data = apiRecord
            nodes.set(locusUID, node)
        }
        if (chronType.startsWith("later")) {
            const uidRelatedLocus:string = apiRecord[relatedLocusIdx]
            if (node.earlierNodes.findIndex(x => x === uidRelatedLocus) == -1) {
                node.earlierNodes.push(apiRecord[relatedLocusIdx])
            }
        } else {
            if (chronType.toLowerCase().startsWith("same")) {
                const uidRelatedLocus:string = apiRecord[relatedLocusIdx]
                if (node.contemporaries.findIndex(x => x === uidRelatedLocus) == -1) {
                    node.contemporaries.push(apiRecord[relatedLocusIdx])
                }
            }
        }
    }
    return nodes.values()
}