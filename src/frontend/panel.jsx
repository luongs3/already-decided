import React, { useEffect, useState } from 'react';
import ForgeReconciler, { Box, Button, Heading, Inline, Lozenge, SectionMessage, Stack, Text, Textfield, TextArea } from '@forge/react';
import { invoke } from '@forge/bridge';

const App = () => {
  const [data, setData] = useState(null);
  const [what, setWhat] = useState('');
  const [why, setWhy] = useState('');
  const refresh = () => invoke('related').then(setData);
  useEffect(() => { refresh(); }, []);

  if (!data) return <Text>Checking the decision ledger…</Text>;
  return (
    <Stack space="space.200">
      {data.matches.length ? (
        <SectionMessage appearance="warning" title="This may reopen a settled decision">
          {data.matches.map(m => (
            <Stack key={m.id} space="space.050">
              <Inline space="space.100"><Lozenge appearance="moved">decided</Lozenge><Text weight="bold">{m.what}</Text></Inline>
              {m.why ? <Text>Why: {m.why}</Text> : null}
              <Text size="small">Source: {m.source || 'ledger'} · match {Math.round(m.score * 100)}%</Text>
            </Stack>
          ))}
        </SectionMessage>
      ) : (
        <SectionMessage appearance="success" title="No conflicting decisions">
          <Text>Nothing in the ledger ({data.total} decisions) overlaps this issue.</Text>
        </SectionMessage>
      )}
      {data.own.length ? <Heading as="h4">Decided on this issue</Heading> : null}
      {data.own.map(d => <Text key={d.id}>• {d.what}{d.why ? ` — ${d.why}` : ''}</Text>)}
      <Box>
        <Heading as="h4">Record a decision</Heading>
        <Textfield placeholder="What was decided" value={what} onChange={e => setWhat(e.target.value)} />
        <TextArea placeholder="Why (rationale)" value={why} onChange={e => setWhy(e.target.value)} />
        <Button appearance="primary" isDisabled={!what} onClick={async () => { await invoke('record', { what, why }); setWhat(''); setWhy(''); refresh(); }}>Save decision</Button>
      </Box>
    </Stack>
  );
};

ForgeReconciler.render(<React.StrictMode><App /></React.StrictMode>);
