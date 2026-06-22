import { useEffect, useId, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';

import { theme } from '@actual-app/components/theme';
import { css } from '@emotion/css';
import { t } from 'i18next';
import {
  Layer,
  Rectangle,
  ResponsiveContainer,
  Sankey,
  Tooltip,
} from 'recharts';
import type { SankeyData } from 'recharts/types/chart/Sankey';

import { Container } from '#components/reports/Container';
import { useFormat } from '#hooks/useFormat';
import { usePrivacyMode } from '#hooks/usePrivacyMode';

type SankeyGraphNode = SankeyData['nodes'][number] & {
  value: number;
  percentageLabel?: string;
  key: string;
  color?: string;
};

type SankeyLinkPayload = {
  source: SankeyGraphNode;
  target: SankeyGraphNode;
  value: number;
  color?: string;
};

type SankeyLinkProps = {
  sourceX: number;
  sourceY: number;
  sourceControlX: number;
  targetX: number;
  targetY: number;
  targetControlX: number;
  linkWidth: number;
  index: number;
  payload: SankeyLinkPayload;
  gradientPrefix: string;
  isHovered: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
};

function SankeyLink({
  sourceX,
  sourceY,
  sourceControlX,
  targetX,
  targetY,
  targetControlX,
  linkWidth,
  index,
  payload,
  gradientPrefix,
  isHovered,
  onMouseEnter,
  onMouseLeave,
}: SankeyLinkProps) {
  if (payload.value <= 0 || linkWidth <= 0) {
    return null;
  }

  const halfWidth = linkWidth / 2;
  const sourceTopY = sourceY - halfWidth;
  const sourceBottomY = sourceY + halfWidth;
  const targetTopY = targetY - halfWidth;
  const targetBottomY = targetY + halfWidth;

  // Filled bezier band: top curve, right edge down, bottom curve back, close.
  const path =
    `M${sourceX},${sourceTopY} ` +
    `C${sourceControlX},${sourceTopY} ${targetControlX},${targetTopY} ${targetX},${targetTopY} ` +
    `L${targetX},${targetBottomY} ` +
    `C${targetControlX},${targetBottomY} ${sourceControlX},${sourceBottomY} ${sourceX},${sourceBottomY} ` +
    `Z`;

  const opacity = isHovered ? 0.85 : 0.55;

  return (
    <path
      d={path}
      fill={`url(#${gradientPrefix}-${index})`}
      fillOpacity={opacity}
      stroke="none"
      cursor="default"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{ transition: 'fill-opacity 0.2s ease' }}
    />
  );
}

type SankeyNodeProps = {
  x: number;
  y: number;
  width: number;
  height: number;
  index: number;
  payload: SankeyGraphNode;
  containerWidth: number;
  showPercentages?: boolean;
  color?: string;
};

const NAME_FONT_SIZE = 13;
const AMOUNT_FONT_SIZE = 11;
const STACKED_LABEL_HEIGHT = NAME_FONT_SIZE + AMOUNT_FONT_SIZE + 3;

function SankeyNode({
  x,
  y,
  width,
  height,
  index: _index,
  payload,
  containerWidth,
  showPercentages,
}: SankeyNodeProps) {
  const privacyMode = usePrivacyMode();
  const format = useFormat();

  if (payload.value <= 0) {
    return null;
  }
  const isOut = x + width + 6 > containerWidth;
  const fillColor = payload.color ?? theme.reportsBlue;

  // Anti-collision: if the node is too short for a two-line stacked label,
  // collapse to a single bold name and skip the dollar amount.
  const stacked = height >= STACKED_LABEL_HEIGHT;
  const labelX = isOut ? x - 6 : x + width + 6;
  const textAnchor = isOut ? 'end' : 'start';
  const centerY = y + height / 2;
  const redactedFont = privacyMode ? t('Redacted Script') : undefined;

  const amountLabel =
    showPercentages && payload.percentageLabel
      ? payload.percentageLabel
      : format(payload.value, 'financial');

  return (
    <Layer>
      <Rectangle x={x} y={y} width={width} height={height} fill={fillColor} />
      {stacked ? (
        <>
          <text
            x={labelX}
            y={centerY - AMOUNT_FONT_SIZE / 2 - 1}
            textAnchor={textAnchor}
            dominantBaseline="middle"
            fontSize={NAME_FONT_SIZE}
            fontWeight={600}
            fill={theme.pageText}
            fontFamily={redactedFont}
          >
            {payload.name || ''}
          </text>
          <text
            x={labelX}
            y={centerY + NAME_FONT_SIZE / 2 + 1}
            textAnchor={textAnchor}
            dominantBaseline="middle"
            fontSize={AMOUNT_FONT_SIZE}
            fill={theme.pageTextSubdued}
            fontFamily={redactedFont}
          >
            {amountLabel}
          </text>
        </>
      ) : (
        <text
          x={labelX}
          y={centerY}
          textAnchor={textAnchor}
          dominantBaseline="middle"
          fontSize={NAME_FONT_SIZE}
          fontWeight={600}
          fill={theme.pageText}
          fontFamily={redactedFont}
        >
          {payload.name || ''}
        </text>
      )}
    </Layer>
  );
}

type LinkGradient = {
  index: number;
  sourceColor: string;
  targetColor: string;
};

type SankeyGraphProps = {
  style?: CSSProperties;
  data: SankeyData;
  showTooltip?: boolean;
  showPercentages?: boolean;
};
export function SankeyGraph({
  style,
  data,
  showTooltip = true,
  showPercentages = false,
}: SankeyGraphProps) {
  const privacyMode = usePrivacyMode();
  const format = useFormat();
  const [hoveredLinkIndex, setHoveredLinkIndex] = useState<number | null>(null);
  const gradientPrefix = useId();

  // Clear the hover index when the underlying dataset changes — otherwise a
  // stale index from the previous chart can index into the new (shorter)
  // links array and surface the wrong tooltipInfo.
  useEffect(() => {
    setHoveredLinkIndex(null);
  }, [data]);

  // Hoist gradient defs to a single block at the top of the Sankey instead of
  // emitting one <defs> per link. Each gradient blends from its source node
  // color to its target node color across the band's bounding box (left to
  // right via x1=0% / x2=100%), which matches the left-to-right flow of the
  // Sankey layout.
  const linkGradients = useMemo<LinkGradient[]>(
    () =>
      data.links.map((link, index) => {
        const sourceNode = data.nodes[
          (link as { source: number }).source
        ] as SankeyGraphNode | undefined;
        const targetNode = data.nodes[
          (link as { target: number }).target
        ] as SankeyGraphNode | undefined;
        return {
          index,
          sourceColor: sourceNode?.color ?? theme.reportsBlue,
          targetColor: targetNode?.color ?? theme.reportsBlue,
        };
      }),
    [data],
  );

  return (
    <Container style={style}>
      {(width, height) => {
        // Adaptive padding: dense graphs (drill-down with 30+ nodes) need the
        // minimum 20px to avoid bands collapsing; sparse graphs (overview
        // card with ~7 nodes) get extra padding so each row is tall enough
        // for the stacked name + amount label. Formula stops adding padding
        // once nodes spread out.
        const nodeCount = Math.max(1, data.nodes?.length ?? 1);
        const adaptivePadding = Math.max(
          20,
          Math.floor(height / (nodeCount * 1.5)),
        );
        return (
          <ResponsiveContainer>
            <Sankey
              data={data}
              node={props => (
                <SankeyNode
                  {...props}
                  containerWidth={width}
                  showPercentages={showPercentages}
                />
              )}
              link={props => (
                <SankeyLink
                  {...props}
                  gradientPrefix={gradientPrefix}
                  isHovered={hoveredLinkIndex === props.index}
                  onMouseEnter={() => setHoveredLinkIndex(props.index)}
                  onMouseLeave={() => setHoveredLinkIndex(null)}
                />
              )}
              sort={false}
              iterations={1000}
              nodePadding={adaptivePadding}
              width={width}
              height={height}
              margin={{
                left: 0,
                right: 0,
                top: 10,
                bottom: 25,
              }}
            >
              <defs>
                {linkGradients.map(g => (
                  <linearGradient
                    key={g.index}
                    id={`${gradientPrefix}-${g.index}`}
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="0%"
                  >
                    <stop offset="0%" stopColor={g.sourceColor} />
                    <stop offset="100%" stopColor={g.targetColor} />
                  </linearGradient>
                ))}
              </defs>
              {showTooltip && (
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const { value = 0, name = '' } = payload[0];
                    const tooltipInfo =
                      hoveredLinkIndex !== null
                        ? (
                            data.links[hoveredLinkIndex] as {
                              tooltipInfo?: Array<{
                                name: string;
                                value: number;
                              }>;
                            }
                          )?.tooltipInfo
                        : undefined;
                    return (
                      <div
                        className={css({
                          zIndex: 1000,
                          pointerEvents: 'none',
                          borderRadius: 2,
                          boxShadow: '0 1px 6px rgba(0, 0, 0, .20)',
                          backgroundColor: theme.menuBackground,
                          color: theme.menuItemText,
                          padding: 10,
                        })}
                      >
                        <div style={{ lineHeight: 1.4 }}>
                          {name && (
                            <div style={{ marginBottom: 5 }}>{name}</div>
                          )}
                          <div
                            style={{
                              fontFamily: privacyMode
                                ? t('Redacted Script')
                                : undefined,
                            }}
                          >
                            {format(value, 'financial')}
                          </div>
                          {tooltipInfo && tooltipInfo.length > 0 && (
                            <div
                              style={{
                                marginTop: 6,
                                fontSize: 11,
                                opacity: 0.7,
                              }}
                            >
                              {tooltipInfo.map(item => (
                                <div key={item.name}>
                                  {item.name} (
                                  <span
                                    style={{
                                      fontFamily: privacyMode
                                        ? t('Redacted Script')
                                        : undefined,
                                    }}
                                  >
                                    {format(item.value, 'financial')}
                                  </span>
                                  )
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  }}
                  isAnimationActive={false}
                />
              )}
            </Sankey>
          </ResponsiveContainer>
        );
      }}
    </Container>
  );
}
