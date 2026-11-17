// Low-poly people built from primitives, with hip and shoulder pivots the player,
// pedestrians, gangsters and officers animate for walking, aiming and hit reactions.
// One model serves everyone; a palette is all it takes to tell a cop from a civilian.
const skinTones = [0x8f5a3a, 0xb97850, 0xd69a6a, 0x6e442e, 0xe0aa7c, 0x9d6c4a];

function box(w, h, d, color, roughness = 0.85) {
  return new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshStandardMaterial({ color, roughness }),
  );
}

export function createCharacterModel(options = {}) {
  const skin = options.skin ?? 0xb97850;
  const shirt = options.shirt ?? 0x2b7c78;
  const pants = options.pants ?? 0x263c45;
  const shoe = options.shoe ?? 0xe4d8bd;
  const hair = options.hair ?? 0x241a16;
  const accent = options.accent ?? 0xf0d3a0;
  const capColor = options.capColor ?? null;

  const group = new THREE.Group();
  const root = new THREE.Group();
  group.add(root);

  const leftLeg = new THREE.Group();
  leftLeg.position.set(-0.16, 0.93, 0);
  const rightLeg = new THREE.Group();
  rightLeg.position.set(0.16, 0.93, 0);
  for (const [leg, side] of [[leftLeg, -1], [rightLeg, 1]]) {
    const thigh = box(0.19, 0.78, 0.23, pants);
    thigh.position.y = -0.39;
    thigh.castShadow = true;
    leg.add(thigh);
    const foot = box(0.22, 0.16, 0.42, shoe);
    foot.position.set(0, -0.79, -0.09);
    foot.castShadow = true;
    leg.add(foot);
    root.add(leg);
  }

  const torso = box(0.6, 0.7, 0.34, shirt);
  torso.position.y = 1.3;
  torso.castShadow = true;
  root.add(torso);
  const chestStripe = box(0.45, 0.18, 0.36, accent);
  chestStripe.position.set(0, 1.4, 0.005);
  root.add(chestStripe);

  const neck = box(0.2, 0.13, 0.2, skin);
  neck.position.y = 1.7;
  root.add(neck);

  const headGroup = new THREE.Group();
  headGroup.position.y = 1.9;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.23, 12, 10), new THREE.MeshStandardMaterial({ color: skin, roughness: 0.72 }));
  head.scale.set(1, 1.08, 0.94);
  head.castShadow = true;
  headGroup.add(head);
  const hairCap = new THREE.Mesh(new THREE.SphereGeometry(0.242, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.57), new THREE.MeshStandardMaterial({ color: hair, roughness: 1 }));
  hairCap.position.y = 0.035;
  hairCap.rotation.x = -0.1;
  headGroup.add(hairCap);
  for (const x of [-0.085, 0.085]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.022, 6, 5), new THREE.MeshBasicMaterial({ color: 0x181512 }));
    eye.position.set(x, 0.035, -0.2);
    headGroup.add(eye);
  }
  if (capColor !== null) {
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.245, 0.245, 0.12, 12), new THREE.MeshStandardMaterial({ color: capColor, roughness: 0.85 }));
    cap.position.y = 0.15;
    headGroup.add(cap);
    const brim = box(0.3, 0.035, 0.22, capColor);
    brim.position.set(0, 0.1, -0.24);
    headGroup.add(brim);
  }
  root.add(headGroup);

  const leftArm = new THREE.Group();
  leftArm.position.set(-0.38, 1.58, 0);
  const rightArm = new THREE.Group();
  rightArm.position.set(0.38, 1.58, 0);
  for (const arm of [leftArm, rightArm]) {
    const sleeve = box(0.17, 0.62, 0.19, shirt);
    sleeve.position.y = -0.3;
    sleeve.castShadow = true;
    arm.add(sleeve);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.095, 8, 6), new THREE.MeshStandardMaterial({ color: skin, roughness: 0.75 }));
    hand.position.y = -0.64;
    arm.add(hand);
    root.add(arm);
  }

  const weapon = new THREE.Group();
  const gunBody = box(0.09, 0.11, 0.42, 0x2a2c2d, 0.45);
  gunBody.position.set(0, -0.02, -0.12);
  weapon.add(gunBody);
  const grip = box(0.08, 0.2, 0.1, 0x202122, 0.6);
  grip.position.set(0, -0.13, 0.02);
  grip.rotation.x = 0.18;
  weapon.add(grip);
  const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 4), new THREE.MeshBasicMaterial({ color: 0xffd57b }));
  muzzle.position.set(0, 0, -0.36);
  weapon.add(muzzle);
  weapon.position.set(0.04, -0.63, -0.1);
  weapon.rotation.x = 0.08;
  weapon.visible = false;
  rightArm.add(weapon);

  group.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  return {
    group,
    root,
    torso,
    head: headGroup,
    leftLeg,
    rightLeg,
    leftArm,
    rightArm,
    weapon,
    palette: { skin, shirt, pants, shoe, hair, accent },
  };
}

export function randomPersonPalette(random) {
  const shirts = [0xc85c48, 0x2c7c7e, 0xe0aa4e, 0x4d5f89, 0x7b4e70, 0xd9d1b6, 0x4f7b5d, 0xe8845b, 0x3d6373];
  const pants = [0x283b46, 0x49453c, 0x6b6252, 0x2d3440, 0x7e6e58, 0x3b4b3b];
  return {
    skin: skinTones[random.int(0, skinTones.length - 1)],
    shirt: shirts[random.int(0, shirts.length - 1)],
    pants: pants[random.int(0, pants.length - 1)],
    shoe: random.pick([0xe2d5bc, 0x252525, 0x9b6b45]),
    hair: random.pick([0x211713, 0x3d291c, 0x0f1111, 0x8d6842]),
    accent: random.pick([0xe8d7ab, 0x2a2f2c, 0xd46b4b]),
    capColor: random.chance(0.18) ? random.pick([0xe6c260, 0x3d6e73, 0xbf5544]) : null,
  };
}

/** A small pose helper: called with the model and a walk phase. */
export function animateWalk(model, phase, amount = 1) {
  const swing = Math.sin(phase) * 0.7 * amount;
  model.leftLeg.rotation.x = swing;
  model.rightLeg.rotation.x = -swing;
  model.leftArm.rotation.x = -swing * 0.7;
  model.rightArm.rotation.x = swing * 0.7;
  model.root.position.y = Math.abs(Math.sin(phase * 2)) * 0.035 * amount;
}

export function poseAim(model) {
  model.rightArm.rotation.x = -1.35;
  model.rightArm.rotation.z = 0.08;
  model.leftArm.rotation.x = -1.1;
  model.leftArm.rotation.z = -0.2;
  model.weapon.visible = true;
  model.root.position.y = 0;
}

export function poseArmed(model) {
  model.rightArm.rotation.x = -1.1;
  model.leftArm.rotation.x = -0.7;
  model.leftArm.rotation.z = -0.12;
  model.weapon.visible = true;
  model.leftLeg.rotation.x = 0;
  model.rightLeg.rotation.x = 0;
  model.root.position.y = 0;
}
