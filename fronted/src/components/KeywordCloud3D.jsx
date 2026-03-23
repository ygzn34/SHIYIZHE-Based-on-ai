import { useEffect, useRef, useState } from 'react';
import * as Cesium from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';

window.CESIUM_BASE_URL = '/cesium/';

// 获取关键词大小（根据出现频率）
const getKeywordSize = (count, maxCount) => {
  const ratio = count / maxCount;
  if (ratio > 0.7) return 20;
  if (ratio > 0.4) return 15;
  if (ratio > 0.2) return 10;
  return 5;
};

// 获取关键词颜色（根据关键词生成不同颜色）
const getKeywordColor = (keyword) => {
  let hash = 0;
  for (let i = 0; i < keyword.length; i++) {
    hash = keyword.charCodeAt(i) + ((hash << 5) - hash);
  }
  const color = (hash & 0x00FFFFFF).toString(16).toUpperCase();
  return '#' + '00000'.substring(0, 6 - color.length) + color;
};

function KeywordCloud3D({ keywords }) {
  const cesiumContainer = useRef(null);
  const viewerRef = useRef(null);
  const [selectedKeyword, setSelectedKeyword] = useState(null);

  useEffect(() => {
    if (cesiumContainer.current && Object.keys(keywords).length > 0) {
      const viewer = new Cesium.Viewer(cesiumContainer.current, {
        animation: false,
        baseLayerPicker: false,
        fullscreenButton: false,
        geocoder: false,
        homeButton: false,
        infoBox: false,
        sceneModePicker: false,
        selectionIndicator: false,
        timeline: false,
        navigationHelpButton: false,
        // 使用默认的椭球体，避免尝试加载 Ion 资源
        terrainProvider: new Cesium.EllipsoidTerrainProvider(),
        // 使用本地复制的 NaturalEarthII 影像图层，确保无需网络也能呈现真实的地球样式
        imageryProvider: new Cesium.TileMapServiceImageryProvider({
          url: '/cesium/Assets/Textures/NaturalEarthII/',
          fileExtension: 'jpg'
        })
      });
      viewerRef.current = viewer;

      const maxCount = Math.max(...Object.values(keywords), 1);
      const entities = [];

      Object.entries(keywords).forEach(([keyword, count]) => {
        const longitude = Math.random() * 360 - 180;
        const latitude = Math.random() * 180 - 90;
        const altitude = Math.random() * 1000000 + 500000;
        const color = Cesium.Color.fromCssColorString(getKeywordColor(keyword));

        const entity = viewer.entities.add({
          position: Cesium.Cartesian3.fromDegrees(longitude, latitude, altitude),
          point: {
            pixelSize: getKeywordSize(count, maxCount),
            color: color,
            outlineColor: Cesium.Color.WHITE,
            outlineWidth: 2,
          },
          description: keyword, // 将关键词存储在 description 中
        });
        entities.push(entity);
      });

      for (let i = 0; i < entities.length - 1; i++) {
        viewer.entities.add({
          polyline: {
            positions: [entities[i].position._value, entities[i + 1].position._value],
            width: 1,
            material: new Cesium.PolylineGlowMaterialProperty({
              glowPower: 0.2,
              color: Cesium.Color.YELLOW,
            }),
          },
        });
      }

      viewer.flyTo(entities, {
        duration: 3.0,
      });

      const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);

      let lastPickTime = 0;
      handler.setInputAction((movement) => {
        const now = Date.now();
        if (now - lastPickTime < 100) return; // 节流，100ms
        lastPickTime = now;

        const pickedObject = viewer.scene.pick(movement.endPosition);
        if (Cesium.defined(pickedObject) && pickedObject.id) {
          const entity = pickedObject.id;
          const description = entity.description.getValue(viewer.clock.currentTime);
          setSelectedKeyword({
            text: description,
            position: movement.endPosition,
          });
        } else {
          setSelectedKeyword(null);
        }
      }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

      return () => {
        handler.destroy();
        viewer.destroy();
      };
    }
  }, [keywords]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '400px' }}>
      <div ref={cesiumContainer} style={{ width: '100%', height: '100%' }} />
      {selectedKeyword && (
        <div
          style={{
            position: 'absolute',
            left: `${selectedKeyword.position.x + 10}px`,
            top: `${selectedKeyword.position.y}px`,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            color: 'white',
            padding: '5px 10px',
            borderRadius: '5px',
            pointerEvents: 'none',
          }}
        >
          {selectedKeyword.text}
        </div>
      )}
    </div>
  );
}

export default KeywordCloud3D;
