/** @jsxRuntime classic */
/** @jsx jsx */
import * as THREE from "three";
import { useRef, Suspense, useState } from "react"; // Remove React
import { Canvas, useLoader, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { css, jsx } from "@emotion/react";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import URDFLoader from "urdf-loader";


const theme = css`
  width: 100vw;
  height: 100vh;
  background-color: #272727;
`;

const mouse = new THREE.Vector2();
const raycaster = new THREE.Raycaster();

const toMouseCoord = (el, e, v) => {
  v.x = ((e.pageX - el.offsetLeft) / el.offsetWidth) * 2 - 1;
  v.y = -((e.pageY - el.offsetTop) / el.offsetHeight) * 2 + 1;
};

const getCollisions = (camera, robot, mouse) => {
  if (!robot) return [];
  raycaster.setFromCamera(mouse, camera);
  const meshes = [];
  robot.traverse(c => c.type === "Mesh" && meshes.push(c));
  return raycaster.intersectObjects(meshes);
};

const isJoint = j => {
  return j.isURDFJoint && j.jointType !== "fixed";
};

const findNearestJoint = m => {
  let curr = m;
  while (curr) {
    if (isJoint(curr)) break;
    curr = curr.parent;
  }
  return curr;
};

const LoadModel = ({ filepath }) => {
  const [hovered, setHovered] = useState(null);
  const { camera, gl } = useThree();
  const ref = useRef();

  const robot = useLoader(URDFLoader, filepath, loader => {
    loader.loadMeshFunc = (path, manager, done) => {
      new STLLoader(manager).load(
        path,
        result => {
          const material = new THREE.MeshPhongMaterial();
          const mesh = new THREE.Mesh(result, material);
          done(mesh);
        },
        null,
        err => done(null, err)
      );
    };
    loader.fetchOptions = { headers: { Accept: "application/vnd.github.v3.raw" } };
  });

  const highlightMaterial = new THREE.MeshPhongMaterial({
    shininess: 10,
    color: "#FFFFFF",
    emissive: "#FFFFFF",
    emissiveIntensity: 0.25
  });

  const highlightLinkGeometry = (m, revert) => {
    const traverse = c => {
      if (c.type === "Mesh") {
        if (revert) {
          c.material = c.__origMaterial;
          delete c.__origMaterial;
        } else {
          c.__origMaterial = c.material;
          c.material = highlightMaterial;
        }
      }
      if (c === m || !isJoint(c)) {
        for (let i = 0; i < c.children.length; i++) {
          traverse(c.children[i]);
        }
      }
    };
    traverse(m);
  };

  const onMouseMove = event => {
    toMouseCoord(gl.domElement, event, mouse);
    const collision = getCollisions(camera, robot, mouse).shift() || null;
    const joint = collision && findNearestJoint(collision.object);
    if (joint !== hovered) {
      if (hovered) {
        highlightLinkGeometry(hovered, true);
        setHovered(null);
      }
      if (joint) {
        highlightLinkGeometry(joint, false);
        setHovered(joint);
      }
    }
  };

  return (
    <mesh
      position={[0, 0, 0]}
      rotation={[-0.5 * Math.PI, 0, Math.PI]}
      scale={[10, 10, 10]}
    >
      <primitive
        ref={ref}
        object={robot}
        dispose={null}
        onPointerMove={onMouseMove}
        onPointerOut={() => {
          if (hovered) {
            highlightLinkGeometry(hovered, true);
            setHovered(null);
          }
        }}
      />
    </mesh>
  );
};

export const Work = () => {
  var modelpath =
    "https://raw.githubusercontent.com/nakano16180/robot-web-viewer/master/public/urdf/open_manipulator.URDF";

  return (
    <div css={theme}>
      <Canvas camera={{ position: [0, 5, 10] }}>
        <hemisphereLight
          skyColor={"#455A64"}
          groundColor={"#000"}
          intensity={0.5}
          position={[0, 1, 0]}
        />
        <directionalLight
          color={0xffffff}
          position={[4, 10, 1]}
          shadow-mapWidth={2048}
          shadow-mapHeight={2048}
          castShadow
        />
        <Suspense fallback={null}>
          <LoadModel filepath={modelpath} />
        </Suspense>
        <OrbitControls />
        <gridHelper args={[10, 10]} />
        <axesHelper />
      </Canvas>
    </div>
  );
};
