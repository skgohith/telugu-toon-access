import React from 'react'
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import type { TemplateEntry } from './registry'

interface Props {
  name?: string
  planName?: string
  orderRef?: string
  amount?: string
  telegramLink?: string
}

const Email = ({ name, planName, orderRef, amount, telegramLink }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your Telugu Toon World access is ready</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>Telugu Toon World</Text>
        <Heading style={heading}>Payment verified — you&apos;re in!</Heading>
        <Text style={text}>
          {name ? `Hi ${name},` : 'Hi there,'} your payment has been verified and your
          {planName ? ` ${planName}` : ''} access is now active.
        </Text>

        {telegramLink ? (
          <Section style={{ margin: '28px 0' }}>
            <Button href={telegramLink} style={button}>
              Join the private Telegram channel
            </Button>
            <Text style={small}>
              If the button does not work, open this link: {telegramLink}
            </Text>
          </Section>
        ) : (
          <Text style={text}>
            Your access is active. Reply to this email if you need the channel invite link.
          </Text>
        )}

        <Hr style={hr} />
        <Text style={small}>Order reference: {orderRef ?? '—'}</Text>
        {planName ? <Text style={small}>Plan: {planName}</Text> : null}
        {amount ? <Text style={small}>Amount paid: {amount}</Text> : null}
        <Text style={small}>
          Please keep this invite link private — it is meant for your account only.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: 'Your Telugu Toon World access is ready',
  displayName: 'Telegram access approved',
  previewData: {
    name: 'Ravi',
    planName: 'Max Premium',
    orderRef: 'TTW-2ABCD9',
    amount: '₹499',
    telegramLink: 'https://t.me/+example',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, Helvetica, sans-serif' }
const container = { padding: '32px 28px', maxWidth: '560px' }
const brand = { fontSize: '13px', letterSpacing: '1px', textTransform: 'uppercase' as const, color: '#f59e0b', margin: '0 0 8px' }
const heading = { fontSize: '24px', color: '#0f172a', margin: '0 0 16px' }
const text = { fontSize: '15px', lineHeight: '24px', color: '#334155' }
const small = { fontSize: '13px', lineHeight: '20px', color: '#64748b', margin: '4px 0' }
const button = {
  backgroundColor: '#0ea5e9',
  color: '#ffffff',
  borderRadius: '10px',
  padding: '13px 22px',
  fontSize: '15px',
  fontWeight: 'bold' as const,
  textDecoration: 'none',
}
const hr = { borderColor: '#e2e8f0', margin: '28px 0 16px' }
