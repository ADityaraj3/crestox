'use client';
import { ReactNode, useState } from 'react';
import SocialButton, { type SocialMediaLink } from '@/components/ui/social-button';

export type Member = {
  name: string;
  role: string;
  avatar: string;
  description: ReactNode;
  /** Same shape as artist detail — platform keys: instagram, twitter, x, linkedin */
  social_media_links?: SocialMediaLink[];
};

/** Founding partners (About Us tab). */
export const foundingPartners: Member[] = [
  {
    name: 'Prayush Shah',
    role: 'Director & Founder',
    avatar: 'https://firebasestorage.googleapis.com/v0/b/crestox-giok1.firebasestorage.app/o/founders%2Ffounder_prayush.jpeg?alt=media',
    description: <>A CEPT alum with a tech-savvy, entrepreneurial spirit, Prayush drives Crestox&apos;s product vision. From crafting seamless user journeys to building robust digital tools, he&apos;s the brains behind our platform&apos;s innovation. With a deep passion for Indian art and its future, Prayush ensures every feature empowers artists and collectors alike.</>,
    social_media_links: [
      { platform: 'linkedin', url: 'https://www.linkedin.com/in/prayush-shah-635146298/' },
      { platform: 'twitter', url: 'https://x.com/prayushshah' },
    ],
  },
  {
    name: 'Udit Shah',
    role: 'Director & Founder',
    avatar: 'https://firebasestorage.googleapis.com/v0/b/crestox-giok1.firebasestorage.app/o/founders%2Ffounder_udit.jpeg?alt=media',
    description: <>A CEPT graduate, Udit brings a strong business pedigree rooted in his family&apos;s ventures. He excels at forging partnerships, growing networks, and overseeing logistics. Udit&apos;s knack for Indian art and culture fuels Crestox&apos;s community building—connecting creators, collectors, and collaborators across the country.</>,
    social_media_links: [
      { platform: 'linkedin', url: 'https://www.instagram.com/udit_1504' },
      { platform: 'instagram', url: 'https://www.linkedin.com/in/udit1504' },
    ],
  },
];

export const advisoryBoard: Member[] = [
  {
    name: 'Aatman Shah',
    role: 'Official CA',
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=800&auto=format&fit=crop',
    description: <><strong>Aatman Shah</strong> is a Chartered Accountant and public policy professional with experience in India&apos;s executive and legislative branches. He has served as <strong>Private Assistant to Finance Minister Nirmala Sitharaman</strong> and the <strong>Union Sports Minister</strong>. Aatman holds a <strong>Master&apos;s in Public Administration</strong> from the <strong>Lee Kuan Yew School of Public Policy, NUS</strong>.</>,
    social_media_links: [
      { platform: 'linkedin', url: 'https://www.linkedin.com/in/aatman-shah' },
    ],
  },
  {
    name: 'Saurin Shah',
    role: 'Official Lawyer',
    avatar: 'https://images.unsplash.com/photo-1566492031526-87ae0ee4fb15?q=80&w=800&auto=format&fit=crop',
    description: <>is the <strong>Managing Director of Nanavati &amp; Nanavati Advocates</strong>, one of India&apos;s most respected law firms, leading its operations for over six years. With extensive experience in corporate, commercial, and regulatory law, he brings strategic legal insight and governance expertise to emerging ventures. His leadership blends deep legal acumen with a forward-looking approach to business and innovation.</>,
    social_media_links: [
      { platform: 'linkedin', url: 'https://www.linkedin.com/in/saurin-shah' },
    ],
  },
  {
    name: 'Niharika Shah',
    role: 'Official Curator',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?q=80&w=800&auto=format&fit=crop',
    description: <>Niharika shah has served as the Director of the Hutheesing Art Gallery for over seven years, overseeing landmark exhibitions and record-breaking art sales. Under his leadership, the gallery has <strong>sold over 120 paintings, with individual works valued up to ₹2.5 crore.</strong> He brings deep expertise in art management, curation, and the business of culture to the startup ecosystem.</>,
    social_media_links: [
      { platform: 'linkedin', url: 'https://www.linkedin.com/in/niharika-shah' },
      { platform: 'instagram', url: 'https://www.instagram.com/niharikashah' },
    ],
  },
  {
    name: 'Jay Shah',
    role: 'Official CA',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=800&auto=format&fit=crop',
    description: <>Jay Shah is a senior banking professional with over <strong>17 years of experience</strong> in <strong>wholesale banking</strong>, spanning financing, investments, trade, M&A, and cross-border transactions. Known for his strong financial acumen and strategic insight, Jay brings a deep understanding of markets, risk, and relationship management to the startup ecosystem.</>,
    social_media_links: [
      { platform: 'linkedin', url: 'https://www.linkedin.com/in/jay-shah' },
    ],
  },
  {
    name: 'Chinmay Shah',
    role: 'Mentor',
    avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?q=80&w=800&auto=format&fit=crop',
    description: <>Chinmay Shah is a third-generation entrepreneur and technology leader with over two decades of experience in digital transformation, IT strategy, and business operations. He has <strong>curated 17+ startups, managed partnerships with 250+ global brands</strong>, and led initiatives in automation, SaaS, and cloud ecosystems. A trusted advisor to global firms, Chinmay specializes in Build-Operate-Transfer models for super apps and digital platforms, combining innovation with sustainable tech-driven growth.</>,
    social_media_links: [
      { platform: 'linkedin', url: 'https://www.linkedin.com/in/chinmay-shah' },
      { platform: 'twitter', url: 'https://x.com/chinmay-shah' },
    ],
  },
];

export function MemberCard({ member }: { member: Member }) {
  const [isActive, setIsActive] = useState(false);
  const links = member.social_media_links ?? [];

  return (
    <div
      className="group overflow-hidden"
      onClick={() => setIsActive(prev => !prev)}
    >
      <img
        className={`h-96 w-full rounded-md object-cover object-top transition-all duration-500
          ${isActive ? 'grayscale-0 h-[22.5rem] rounded-xl' : 'grayscale'}
          md:grayscale md:group-hover:grayscale-0 md:group-hover:h-[22.5rem] md:group-hover:rounded-xl`}
        src={member.avatar}
        alt={member.name}
        width="826"
        height="1239"
      />
      <div className="px-2 pt-2 sm:pb-0 sm:pt-4">
        <div className="flex justify-between items-center">
          <h3 className="text-base font-medium transition-all duration-500">
            {member.role}
          </h3>
        </div>
        <div className="mt-1 flex items-center justify-between">
          <span
            className={`inline-block text-sm transition-all duration-500
              ${isActive ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'}
              md:translate-y-6 md:opacity-0 md:group-hover:translate-y-0 md:group-hover:opacity-100`}
          >
            {member.name} <br />
            <span className="mt-4 block">{member.description}</span>
            {links.length > 0 && (
              <div
                className="mt-4 flex flex-wrap items-center gap-2 pointer-events-auto"
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
                role="presentation"
              >
                <SocialButton
                  links={links}
                  className="min-w-0 scale-[0.92] origin-left sm:scale-95"
                />
              </div>
            )}
          </span>
        </div>
      </div>
    </div>
  );
}

