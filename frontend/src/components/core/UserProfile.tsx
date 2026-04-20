import React from 'react';
import {
  Persona,
  Button,
  Tooltip,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import { SignOut24Regular } from '@fluentui/react-icons';
import { useMsal } from '@azure/msal-react';
import { useAuth } from '../../hooks/useAuth';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
  },
});

export const UserProfile: React.FC = () => {
  const styles = useStyles();
  const { user } = useAuth();
  const { instance } = useMsal();

  if (!user) return null;

  const displayName = user.name ?? user.username;
  const email = user.name ? user.username : undefined;

  const handleLogout = () => {
    instance.logoutRedirect({ account: user });
  };

  return (
    <div className={styles.container}>
      <Persona
        name={displayName}
        secondaryText={email}
        size="small"
        avatar={{ color: 'colorful' }}
      />
      <Tooltip content="Sign out" relationship="label">
        <Button
          appearance="subtle"
          size="small"
          icon={<SignOut24Regular />}
          aria-label="Sign out"
          onClick={handleLogout}
        />
      </Tooltip>
    </div>
  );
};
