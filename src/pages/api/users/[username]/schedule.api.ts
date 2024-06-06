import { prisma } from '@/src/lib/prisma'
import { z } from 'zod'
import { NextApiRequest, NextApiResponse } from 'next'
import dayjs from 'dayjs'

export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== 'POST') {
    return res.status(405).end()
  }

  const username = String(req.query.username)

  const user = await prisma.user.findUnique({
    where: {
      username,
    },
  })
  if (!user) {
    return res.status(400).json({ message: 'User does not exist' })
  }
  const createSchedulingBody = z.object({
    name: z.string(),
    email: z.string().email(),
    observations: z.string(),
    date: z.string().datetime(),
  })

  const { name, email, observations, date } = createSchedulingBody.parse(
    req.body,
  )

  const shedulingDate = dayjs(date).startOf('hour')

  if (shedulingDate.isBefore(new Date())) {
    return res.status(400).json({
      message: 'Date is in tehe past',
    })
  }

  const conflictingScheduling = await prisma.schedule.findFirst({
    where: {
      user_id: user.id,
      date: shedulingDate.toDate(),
    },
  })

  if (conflictingScheduling) {
    return res.status(400).json({
      message: 'There is another scheduling at the same time',
    })
  }

  await prisma.schedule.create({
    data: {
      name,
      email,
      observations,
      date: shedulingDate.toDate(),
      user_id: user.id,
    },
  })

  return res.status(201).end()
}
