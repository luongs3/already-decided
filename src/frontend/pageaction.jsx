import React, { useEffect, useState } from 'react';
import ForgeReconciler, { Modal, ModalBody, ModalHeader, ModalTitle, SectionMessage, Text } from '@forge/react';
import { invoke, view } from '@forge/bridge';

const App = () => {
  const [res, setRes] = useState(null);
  useEffect(() => { invoke('recordPage').then(setRes); }, []);
  return (
    <Modal onClose={() => view.close()}>
      <ModalHeader><ModalTitle>Already Decided</ModalTitle></ModalHeader>
      <ModalBody>
        {!res ? <Text>Scanning page for DECISION: lines…</Text> : (
          <SectionMessage appearance={res.found ? 'success' : 'information'} title={`${res.found} decision(s) found in "${res.title}"`}>
            <Text>{res.recorded.length} new decision(s) added to the ledger.</Text>
            {res.recorded.map(d => <Text key={d.id}>• {d.what}</Text>)}
          </SectionMessage>
        )}
      </ModalBody>
    </Modal>
  );
};

ForgeReconciler.render(<React.StrictMode><App /></React.StrictMode>);
