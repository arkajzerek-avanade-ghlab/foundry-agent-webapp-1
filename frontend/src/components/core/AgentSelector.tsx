import React, { useCallback } from 'react';
import { Dropdown, Option, makeStyles, tokens, Text } from '@fluentui/react-components';
import type { IAgentMetadata } from '../../types/chat';

interface AgentSelectorProps {
  agents: IAgentMetadata[];
  currentAgentId: string | null;
  onSelectAgent: (agentId: string) => void;
  disabled?: boolean;
}

const useStyles = makeStyles({
  container: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  dropdown: {
    minWidth: '180px',
    maxWidth: '260px',
    '& button': {
      fontSize: tokens.fontSizeBase200,
      minHeight: '28px',
      paddingTop: '2px',
      paddingBottom: '2px',
    },
  },
  optionContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1px',
  },
  optionDescription: {
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase100,
    lineHeight: tokens.lineHeightBase100,
  },
});

export const AgentSelector: React.FC<AgentSelectorProps> = ({
  agents,
  currentAgentId,
  onSelectAgent,
  disabled = false,
}) => {
  const styles = useStyles();

  const handleChange = useCallback(
    (_: unknown, data: { optionValue?: string }) => {
      if (data.optionValue) {
        onSelectAgent(data.optionValue);
      }
    },
    [onSelectAgent]
  );

  // Don't render if only one agent
  if (agents.length <= 1) return null;

  const selectedAgent = agents.find(a => a.id === currentAgentId);

  return (
    <div className={styles.container}>
      <Dropdown
        className={styles.dropdown}
        value={selectedAgent?.name || ''}
        selectedOptions={currentAgentId ? [currentAgentId] : []}
        onOptionSelect={handleChange}
        disabled={disabled}
        size="small"
        aria-label="Select agent"
      >
        {agents.map(agent => (
          <Option key={agent.id} value={agent.id} text={agent.name}>
            {agent.description ? (
              <div className={styles.optionContent}>
                <Text size={200}>{agent.name}</Text>
                <Text className={styles.optionDescription}>{agent.description}</Text>
              </div>
            ) : (
              agent.name
            )}
          </Option>
        ))}
      </Dropdown>
    </div>
  );
};
