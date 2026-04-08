import { GetServerSideProps } from 'next';
import Head from 'next/head';
import { memberApi, MemberResponse, AttendanceResponse } from '@/lib/api';
import MemberPanel from '@/components/MemberPanel';

interface Props {
  monaCode: string;
  member: MemberResponse | null;
  error?: string;
}

export default function MemberDetailPage({ monaCode, member, error }: Props) {
  return (
    <>
      <Head>
        <title>{member ? `${member.name} - 의정활동` : '의원 정보'}</title>
      </Head>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-2xl mx-auto py-8 px-4">
          {error ? (
            <div className="text-red-500 text-center py-10">{error}</div>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-hidden h-[80vh]">
              <MemberPanel monaCd={monaCode} />
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const monaCode = context.params?.monaCode as string;

  try {
    const member = await memberApi.getMember(monaCode);
    return { props: { monaCode, member } };
  } catch {
    return { props: { monaCode, member: null, error: '의원 정보를 찾을 수 없습니다.' } };
  }
};
