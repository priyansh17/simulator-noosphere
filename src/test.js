const filterWithLowPriority = (allNodes, storageType, size, maxNodes) => {

    console.log("finding nodes with", storageType, size);
    var sizeSatisfiedNodes = 0;
    var storageSatisfiedNodes = 0;
    var satisfiedNodes = [];

    allNodes.forEach((node) => {
        const nodeTags = node.tags;
        if (nodeTags.includes(storageType)) {
            storageSatisfiedNodes += 1
        }

        if (nodeTags.includes(size)) {
            sizeSatisfiedNodes += 1
        }

        if (nodeTags.includes(storageType) && nodeTags.includes(size)) {

            if (satisfiedNodes.length < maxNodes) {
                satisfiedNodes.push(node);
                allNodes.filter((n) => !(n.name === node.name));
                console.log("picked up node: ", node.name);
            }
        }
    })

    return [satisfiedNodes, sizeSatisfiedNodes, storageSatisfiedNodes];

}

const filterNodes = (nodes, storageType, size, specialTags, exclusionList, maxNodes, strictProvisioning) => {
    console.log("Filtering Nodes", storageType, size, specialTags, exclusionList, maxNodes, strictProvisioning)
    var sizeSatisfiedNodes = 0;
    var storageSatisfiedNodes = 0;

    var allNodes = nodes;

    // filtering only based on special tags and exclusion tags here
    const filteredNodes = allNodes.filter((node) => {
        const nodeTags = node.tags;
        let tagCounter = nodeTags.length - 2;  // -2 because we don't consider size and storage first.

        // Match all special tags
        if (!specialTags.every((specialTag) => nodeTags.includes(specialTag))) {
            return false;
        } else {
            tagCounter -= specialTags.length;
        }

        exclusionList.forEach((exclusionTag) => {
            nodeTags.forEach((tag) => {
                const regex = new RegExp(exclusionTag);
                const check = regex.test(tag);
                if (check) {
                    tagCounter -= 1;
                }
            });
        });

        return tagCounter === 0;
    })

    var satisfiedNodes = []

    // checking sizesatify and storage satify here and picking nodes
    filteredNodes.forEach((node) => {
        const nodeTags = node.tags;
        if (nodeTags.includes(storageType)) {
            storageSatisfiedNodes += 1
        }

        if (nodeTags.includes(size)) {
            sizeSatisfiedNodes += 1
        }

        if (nodeTags.includes(storageType) && nodeTags.includes(size)) {
            if (satisfiedNodes.length < maxNodes) {
                satisfiedNodes.push(node);
                allNodes.filter((n) => !(n.name === node.name));
                console.log("picked up node: ", node.name);
            }
        }
    })

    if (satisfiedNodes.length >= maxNodes) {
        // if we have enough return
        console.log("foudn enough nodes");
        return satisfiedNodes;
    } else {
        if (strictProvisioning) {
            return [];

            //when stirct is false we fallback to lower type
        } else {
            console.log("starting priority reduction");
            // keep lowering priority and search for nodes
            var moreTofind = maxNodes - satisfiedNodes.length;
            while (moreTofind > 0) {
                console.log("inside while...")
                var newStorageType, newSize, selectedNodes;

                if (sizeSatisfiedNodes > storageSatisfiedNodes) {
                    newStorageType = reducePriority(storageType, priorityStorage);
                    newSize = size;
                    console.log("reduced storage priority to", newStorageType);
                }
                else {
                    newSize = reducePriority(size, prioritySize);
                    newStorageType = storageType;
                    console.log("reduced size priority to", newSize);
                }

                // fallback loop prevention
                if (storageType == newStorageType) {
                    newSize = reducePriority(size, prioritySize);
                    console.log("reduced size priority to", newSize);
                }


                //already at the lowest priority
                if (newSize == size && newStorageType == storageType) {
                    break;
                }

                var res = filterWithLowPriority(allNodes, newStorageType, newSize, moreTofind)
                selectedNodes = res[0]
                sizeSatisfiedNodes = res[1]
                storageSatisfiedNodes = res[2]
                satisfiedNodes.push(...selectedNodes);
                allNodes.filter((node) => !selectedNodes.some((selectedNode) => selectedNode.name === node.name));
                moreTofind -= selectedNodes.length;
            }
            if (moreTofind == 0) {
                return satisfiedNodes;
            } else {
                // we couldn't get all 
                return [];
            }
        }
    }

};

const FilterForCdep = () => {
    const { spec, 'special-tags': specialTags, maxSpecialTagNodes, 'strict-provisioning': strictProvisioning } = poolProperties;
    let { 'no-of-nodes': requiredCount } = payload;
    const [storageType, size] = spec.split('-');

    if (!spec || !specialTags || maxSpecialTagNodes === -1) {
        return [];
    }

    if (!prioritySize.includes(size)) {
        openModal("Not a valid size: xl, 2xl, 4xl")
        return
    }

    if (!priorityStorage.includes(storageType)) {
        openModal("Not a valid storage: hdd, ssd, nvme")
        return
    }

    // Replace "any" with the least priority
    // const filteredStorageType = storageType === 'any' ? priorityStorage[0] : storageType;
    // const filteredSize = size === 'any' ? prioritySize[0] : size;

    console.log('Storage Type:', storageType);
    console.log('Size:', size);

    const filteredNodes1 = filterNodes(nodes, storageType, size, specialTags, exclusionList, maxSpecialTagNodes, strictProvisioning);

    if (filteredNodes1.length < maxSpecialTagNodes) {
        handleNotEnoughNodes();
        return;
    }

    setNodesFilter1(filteredNodes1);
    console.log("Filter1 nodes", filteredNodes1)

    // Decrease the required count
    requiredCount -= maxSpecialTagNodes;

    var leftNodes = nodes.filter((node) => !filteredNodes1.some((filteredNode) => filteredNode.name === node.name));
    console.log("lEFT NODES after pass 1: ", leftNodes)

    const filteredNodes2 = filterNodes(leftNodes, storageType, size, [], exclusionList, requiredCount, strictProvisioning);

    if (filteredNodes2.length < requiredCount) {
        handleNotEnoughNodes(strictProvisioning);
        return;
    }
    setNodesFilter2(filteredNodes2);
    console.log("Filter2 nodes", filteredNodes2)

    removeFromNodes(filteredNodes1);
    removeFromNodes(filteredNodes2);
};