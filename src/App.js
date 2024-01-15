import React, { useState } from 'react';
import { Container, Row, Col, Form, Button, Badge } from 'react-bootstrap';
import ModalComponent from '../src/Modal';

const allNodes = [
  { name: 'Node 1', tags: ['ssd', 'xl', 'gpu'], team: "field" },
  { name: 'Node 2', tags: ['hdd', '2xl'], team: "cml" },
  { name: 'Node 3', tags: ['ssd', 'xl', 'gpu'], team: "cml" },
  { name: 'Node 4', tags: ['hdd', 'xl', 'gpu'], team: "field" },
  { name: 'Node 5', tags: ['ssd', '2xl'], team: "cde" },
  { name: 'Node 6', tags: ['hdd', '2xl'], team: "cde" },
  { name: 'Node 7', tags: ['ssd', 'xl', 'gpu', 'prewarmed-7.9'], team: "cde" },
  { name: 'Node 8', tags: ['hdd', 'xl'], team: "field" },
  { name: 'Node 9', tags: ['ssd', 'xl'], team: "field" },
  { name: 'Node 10', tags: ['ssd', 'xl', 'gpu'], team: "field" },
]

const priorityStorage = ['hdd', 'ssd', 'nvme']
const prioritySize = ['xl', '2xl', '4xl']
const exclusionList = ['prewarmed-.*', 'donotpickup', 'specialPurpose'];
const teamsList = ['field', 'cml', 'cde']

const MyApp = () => {

  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [nodes, setNodes] = useState(allNodes);
  const [teamFilter, setTeamFilter] = useState([]);
  const [nodesFilter1, setNodesFilter1] = useState([]);
  const [nodesFilter2, setNodesFilter2] = useState([]);
  const [newNode, setNewNode] = useState({
    name: '',
    tags: [],
    team: ''
  })

  const [poolProperties, setPoolProperties] = useState({
    maxNodes: 10,
    spec: 'ssd-xl',
    specialTags: ['gpu'],
    strictProvisioning: true,
    maxSpecialTagNodes: '2',
    teamTag: 'field',
  });

  const [payload, setPayload] = useState({
    Nodes: '3',
    PoolName: 'comops-test',
  });

  const handlePoolPropertiesChange = (event) => {
    const { name, value } = event.target;

    if (name === 'specialTags') {
      const tagsArray = value.split(',').map((tag) => tag.trim());
      setPoolProperties((prevData) => ({
        ...prevData,
        [name]: tagsArray,
      }));
    } else {
      setPoolProperties((prevData) => ({
        ...prevData,
        [name]: value,
      }));
    }
  };

  const handlePayloadChange = (event) => {
    const { name, value } = event.target;

    setPayload((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleAddNode = () => {
    setNodes((prevNodes) => [...prevNodes, newNode]);
    setNewNode({
      name: '',
      tags: [],
      team: ''
    });
  };

  const handleNewNodeChange = (event) => {
    const { name, value } = event.target;

    if (name === 'tags') {
      const tagsArray = value.split(',').map((tag) => tag.trim());
      setNewNode((prevNode) => ({
        ...prevNode,
        [name]: tagsArray,
      }));
    } else {
      setNewNode((prevNode) => ({
        ...prevNode,
        [name]: value,
      }));
    }
  };

  const handleDeleteNode = (name) => {
    setNodes((prevNodes) => prevNodes.filter((node) => node.name !== name));
  };

  const openModal = (message) => {
    setModalMessage(message);
    setShowModal(true);
  };

  const closeModal = () => {
    setModalMessage("");
    setShowModal(false);
  };

  // const removeFromNodes = (filteredNodes) => {
  //   return nodes.filter((node) => !filteredNodes.some((filteredNode) => filteredNode.name === node.name));
  // };

  const reducePriority = (currentPriority, priorityList) => {
    const currentIndex = priorityList.indexOf(currentPriority);
    return priorityList.slice(0, currentIndex + 1);
  };

  const handleNotEnoughNodes = () => {
    setTeamFilter([]);
    setNodesFilter1([]);
    setNodesFilter2([]);
    console.log('Not enough nodes');
    openModal('Not enough nodes.');
  };

  const ResetNodes = () => {
    setNodes(allNodes);
    setTeamFilter([]);
    setNodesFilter1([]);
    setNodesFilter2([]);
  }

  // filterNodesForCdep functions:

  const selectSpecialNodes = (allNodes, specialTags) => {
    let selected = [];
    console.log("Filtering for special tagged nodes")
    selected = allNodes.filter((node) => {
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
    console.log("Filtering for special tagged nodes returned: ", selected)
    return selected;
  }

  const selectNodes = (size, storage, strict, maxNodes, allNodes) => {
    let selectedNodes = [];

    // first we compute with strict assumed as true
    allNodes.forEach((node) => {
      const nodeTags = node.tags;
      if (nodeTags.includes(storage) && nodeTags.includes(size)) {
        if (selectedNodes.length < maxNodes) {
          selectedNodes.push(node);
          allNodes = allNodes.filter((n) => !(n.name === node.name));
          console.log("picked up node: ", node.name);
        }
      }
    });

    // if strict or if not strict but satisfied
    if (strict || (!strict && selectedNodes.length === maxNodes)) {
      return selectedNodes;
    } else {

      console.log("checking for nodes with priority reduction");

      var allowedSizes = reducePriority(size, prioritySize);
      var allowedStorages = reducePriority(storage, priorityStorage);

      allNodes.forEach((node) => {
        const nodeTags = node.tags;

        const anySizePresent = allowedSizes.some((element) => nodeTags.includes(element));
        const anyStoragePresent = allowedStorages.some((element) => nodeTags.includes(element));

        if (anyStoragePresent && anySizePresent) {
          if (selectedNodes.length < maxNodes) {
            selectedNodes.push(node);
            allNodes = allNodes.filter((n) => !(n.name === node.name));
            console.log("picked up node: ", node.name);
          }
        }
      });
    }
    return selectedNodes;
  }


  const FilterNodesForCdep = () => {

    const spec = poolProperties.spec;
    const [storageType, sizeType] = spec.split('-');

    if (!priorityStorage.includes(storageType)) {
      console.log('Invalid storage type.');
      openModal('Invalid storage type.');
    }

    if (!prioritySize.includes(sizeType)) {
      console.log('Invalid size type.');
      openModal('Invalid size type.');
    }

    // step 1:

    let teamFilterNodes = [];
    if (teamsList.includes(poolProperties.teamTag)) {
      console.log("Filtering for team tag", poolProperties.teamTag);
      teamFilterNodes = nodes.filter((node) => {
        return node.team === poolProperties.teamTag
      });
    } else {
      console.log("No such team tag");
      teamFilterNodes = nodes;
    }
    setTeamFilter(teamFilterNodes);

    if (teamFilterNodes.length < payload.Nodes) {
      handleNotEnoughNodes();
      return;
    }

    // step 2:
    let availableNodes = teamFilterNodes;
    let selectedNodes = []

    if (poolProperties.specialTags.length > 0) {
      let requiredSpecialNodes = poolProperties.maxSpecialTagNodes

      let specialNodes = selectSpecialNodes(availableNodes, poolProperties.specialTags)
      if (specialNodes.length < requiredSpecialNodes) {
        handleNotEnoughNodes();
        return;
      } else {
        selectedNodes = selectNodes(sizeType, storageType, poolProperties.strictProvisioning, requiredSpecialNodes, specialNodes);
        // removing the selected nodes from all nodes.
        availableNodes = availableNodes.filter((node) => !selectedNodes.some((filteredNode) => filteredNode.name === node.name));
      }
    }
    setNodesFilter1(selectedNodes);

    if (selectedNodes.length < poolProperties.maxSpecialTagNodes) {
      handleNotEnoughNodes();
      return;
    }

    // step 3:
    // now we have to filter out first nodes which don't have any special tags:
    let requiredNodesCount = payload.Nodes - poolProperties.maxSpecialTagNodes;
    console.log("More ", requiredNodesCount, " nodes required.")
    // using empty list in special tags ensures we don't select filter nodes
    let commonNodes = selectSpecialNodes(availableNodes, []);
    if (commonNodes.length < requiredNodesCount) {
      handleNotEnoughNodes();
      return;
    } else {
      selectedNodes = selectNodes(sizeType, storageType, poolProperties.strictProvisioning, requiredNodesCount, commonNodes);
      // removing the selected nodes from all nodes.
      availableNodes = availableNodes.filter((node) => !selectedNodes.some((filteredNode) => filteredNode.name === node.name));
    }

    setNodesFilter2(selectedNodes);

    if (selectedNodes.length < requiredNodesCount) {
      handleNotEnoughNodes();
      return;
    }
  }


  return (

    <Container>
      <ModalComponent show={showModal} handleClose={closeModal} message={modalMessage} />
      <Row className="border border-primary">
        <Col className="border border-primary">
          <h2>PoolProperties</h2>
          <Form>
            <Form.Group controlId="maxNodes">
              <Form.Label>Max Nodes</Form.Label>
              <Form.Control
                type="text"
                placeholder="Enter Max Nodes"
                name="maxNodes"
                value={poolProperties.maxNodes}
                onChange={handlePoolPropertiesChange}
              />
            </Form.Group>

            <Form.Group controlId="spec">
              <Form.Label>Spec</Form.Label>
              <Form.Control
                type="text"
                placeholder="Enter Spec"
                name="spec"
                value={poolProperties.spec}
                onChange={handlePoolPropertiesChange}
              />
            </Form.Group>

            <Form.Group controlId="specialTags">
              <Form.Label>Special Tags</Form.Label>
              <Form.Control
                type="text"
                placeholder="Enter Special Tags (comma-separated)"
                name="specialTags"
                value={poolProperties.specialTags.join(', ')}
                onChange={handlePoolPropertiesChange}
              />
            </Form.Group>

            <Form.Group controlId="strictProvisioning">
              <Form.Check
                type="checkbox"
                label="Strict Provisioning"
                name="strictProvisioning"
                checked={poolProperties.strictProvisioning}
                onChange={() => {
                  setPoolProperties((prevData) => ({
                    ...prevData,
                    strictProvisioning: !poolProperties.strictProvisioning,
                  }));
                }}
              />
            </Form.Group>

            <Form.Group controlId="maxSpecialTagNodes">
              <Form.Label>Max Special Tagged Nodes</Form.Label>
              <Form.Control
                type="text"
                placeholder="Count of special nodes"
                name="maxSpecialTagNodes"
                value={poolProperties.maxSpecialTagNodes}
                onChange={handlePoolPropertiesChange}
              />
            </Form.Group>

            <Form.Group controlId="teamTag">
              <Form.Label>Team Tag</Form.Label>
              <Form.Control
                type="text"
                placeholder="Team Tag"
                name="teamTag"
                value={poolProperties.teamTag}
                onChange={handlePoolPropertiesChange}
              />
            </Form.Group>

          </Form>
        </Col>

        <Col className="border border-primary">
          <h2>Payload</h2>
          <Form>
            <Form.Group controlId="Nodes">
              <Form.Label>No. of Nodes</Form.Label>
              <Form.Control
                type="text"
                placeholder="Enter No. of Nodes"
                name="Nodes"
                value={payload.Nodes}
                onChange={handlePayloadChange}
              />
            </Form.Group>

            <Form.Group controlId="PoolName">
              <Form.Label>Pool Name</Form.Label>
              <Form.Control
                type="text"
                placeholder="Enter Pool Name"
                name="PoolName"
                value={payload.PoolName}
                onChange={handlePayloadChange}
              />
            </Form.Group>
          </Form>
        </Col>
      </Row>

      <Row className="border border-primary">
        <Col className="border border-primary">
          <h2>Add New Node</h2>
          <Form>
            <Form.Group controlId="name">
              <Form.Label>Name</Form.Label>
              <Form.Control
                type="text"
                placeholder="Enter Name"
                name="name"
                value={newNode.name}
                onChange={handleNewNodeChange}
              />
            </Form.Group>

            <Form.Group controlId="tags">
              <Form.Label>Special Tags</Form.Label>
              <Form.Control
                type="text"
                placeholder="Enter Tags (comma-separated)"
                name="tags"
                value={newNode.tags.join(', ')}
                onChange={handleNewNodeChange}
              />
            </Form.Group>

            <Form.Group controlId="team">
              <Form.Label>Team Tag</Form.Label>
              <Form.Control
                type="text"
                placeholder="Enter Team Tag"
                name="team"
                value={newNode.team}
                onChange={handleNewNodeChange}
              />
            </Form.Group>

            <Button variant="primary" onClick={handleAddNode}>
              Add Node
            </Button>
          </Form>
        </Col>
      </Row>

      <Row style={{ alignItems: 'center', justifyContent: 'center' }}>
        Exclusion List: {exclusionList.map((name, index) => (
          <Button variant="info" style={{ margin: '1px' }} key={index}>
            {name}
            <br />
          </Button>
        ))}
      </Row>

      <Row style={{ alignItems: 'center', justifyContent: 'center' }}>
        Team Tags List: {teamsList.map((name, index) => (
          <Button variant="info" style={{ margin: '1px' }} key={index}>
            {name}
            <br />
          </Button>
        ))}
      </Row>

      <Row className="border border-primary">
        <Col className="border border-primary">
          <h2>
            Virtual Netbox
          </h2>
          {nodes.map((node, index) => (
            <Row key={index}>
              <Button variant="danger" style={{ margin: '1px' }}>
                {node.name}
                <br />
                {node.tags.map((tag, tagIndex) => (
                  <Badge key={tagIndex}>
                    {tag}
                  </Badge>
                ))}
                <br />
                {
                  <Badge>
                    {node.team}
                  </Badge>
                }
              </Button>
              <Button
                variant="dark"
                onClick={() => handleDeleteNode(node.name)}
              >
                X
              </Button>
            </Row>
          ))}
        </Col>
        <Col className="border border-primary">
          <h2>
            PrePrimary Filtering
          </h2>
          {
            teamFilter.map((node, index) => (
              <Row key={index}>
                <Button variant="success" style={{ margin: '1px' }}>
                  {node.name}
                  <br />
                  {node.tags.map((tag, tagIndex) => (
                    <Badge key={tagIndex}>
                      {tag}
                    </Badge>
                  ))}
                  <br />
                  {
                    <Badge>
                      {node.team}
                    </Badge>
                  }
                </Button>
              </Row>
            ))
          }
        </Col>
        <Col className="border border-primary">
          <h2>
            Primary Filtering
          </h2>
          {
            nodesFilter1.map((node, index) => (
              <Row key={index}>
                <Button variant="success" style={{ margin: '1px' }}>
                  {node.name}
                  <br />
                  {node.tags.map((tag, tagIndex) => (
                    <Badge key={tagIndex}>
                      {tag}
                    </Badge>
                  ))}
                  <br />
                  {
                    <Badge>
                      {node.team}
                    </Badge>
                  }
                </Button>
              </Row>
            ))
          }
        </Col>
        <Col className="border border-primary">
          <h2>
            Secondary Filtering
          </h2>
          {
            nodesFilter2.map((node, index) => (
              <Row key={index}>
                <Button variant="success" style={{ margin: '1px' }}>
                  {node.name}
                  <br />
                  {node.tags.map((tag, tagIndex) => (
                    <Badge key={tagIndex}>
                      {tag}
                    </Badge>
                  ))}
                  <br />
                  {
                    <Badge>
                      {node.team}
                    </Badge>
                  }
                </Button>
              </Row>
            ))
          }
        </Col>
      </Row>

      <Row style={{ alignItems: 'center', justifyContent: 'center' }}>
        <Button variant='success' style={{ margin: '2px' }} onClick={FilterNodesForCdep}>
          Filter Nodes for CDEP
        </Button>
      </Row>


      <Row style={{ alignItems: 'center', justifyContent: 'center' }}>
        <Button variant='warning' style={{ margin: '2px' }} onClick={ResetNodes}>
          Reset Nodes
        </Button>
      </Row>

    </Container >
  );
};

export default MyApp;
