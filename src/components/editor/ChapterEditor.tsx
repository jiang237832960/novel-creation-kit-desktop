import React, { useState, useEffect } from 'react';
import { Input, Typography, Button, Space, message, Card, Tag, Select, Empty, Modal, Form } from 'antd';
import { 
  PlusOutlined, 
  CheckCircleOutlined,
  ClockCircleOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import { v4 as uuidv4 } from 'uuid';
import type { Chapter } from '../../types';

const { Title, Text } = Typography;
const { TextArea } = Input;

interface ChapterEditorProps {
  projectId: string;
  projectPath: string;
  chapters: Chapter[];
  currentChapter: Chapter | null;
  onChapterSelect: (chapter: Chapter) => void;
  onChapterAdd: (chapter: Chapter) => void;
  onChapterUpdate: (id: string, updates: Partial<Chapter>) => void;
  onChapterDelete: (id: string) => void;
  onSave: () => void;
}

const ChapterEditor: React.FC<ChapterEditorProps> = ({
  projectId,
  projectPath: _projectPath,
  chapters,
  currentChapter,
  onChapterSelect,
  onChapterAdd,
  onChapterUpdate,
  onChapterDelete,
  onSave: _onSave,
}) => {
  const [content, setContent] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newChapterTitle, setNewChapterTitle] = useState('');
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (currentChapter) {
      setContent(currentChapter.content);
      setIsDirty(false);
    }
  }, [currentChapter?.id]);

  const handleContentChange = (value: string) => {
    setContent(value);
    setIsDirty(true);
    
    if (currentChapter) {
      onChapterUpdate(currentChapter.id, {
        content: value,
        wordCount: countWords(value),
        updatedAt: new Date().toISOString(),
      });
    }
  };

  const countWords = (text: string): number => {
    return text.replace(/\s/g, '').length;
  };

  const handleAddChapter = () => {
    if (!newChapterTitle.trim()) {
      message.warning('请输入章节标题');
      return;
    }

    const chapterNumber = chapters.length + 1;
    const newChapter: Chapter = {
      id: uuidv4(),
      projectId,
      number: chapterNumber,
      title: newChapterTitle,
      content: '',
      status: 'draft',
      wordCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onChapterAdd(newChapter);
    onChapterSelect(newChapter);
    setIsModalOpen(false);
    setNewChapterTitle('');
    message.success(`第${chapterNumber}章 "${newChapterTitle}" 创建成功`);
  };

  const handleDeleteChapter = (chapter: Chapter) => {
    Modal.confirm({
      title: '确定要删除这个章节吗？',
      content: `删除后无法恢复：${chapter.title}`,
      okText: '删除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: () => {
        onChapterDelete(chapter.id);
        message.success('章节已删除');
      },
    });
  };

  const getStatusTag = (status: Chapter['status']) => {
    const config = {
      draft: { color: 'default', text: '草稿', icon: <ClockCircleOutlined /> },
      review: { color: 'warning', text: '审核中', icon: <ClockCircleOutlined /> },
      published: { color: 'success', text: '已发布', icon: <CheckCircleOutlined /> },
    };
    return config[status];
  };

  const sortedChapters = [...chapters].sort((a, b) => a.number - b.number);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space>
            <Select
              value={currentChapter?.id}
              onChange={(value) => {
                const chapter = chapters.find(c => c.id === value);
                if (chapter) onChapterSelect(chapter);
              }}
              style={{ minWidth: 200 }}
              placeholder="选择章节"
              disabled={chapters.length === 0}
            >
              {sortedChapters.map((chapter) => (
                <Select.Option key={chapter.id} value={chapter.id}>
                  <Space>
                    <Text>第{chapter.number}章</Text>
                    <Text type="secondary">{chapter.title}</Text>
                    <Tag color={getStatusTag(chapter.status).color}>
                      {getStatusTag(chapter.status).text}
                    </Tag>
                  </Space>
                </Select.Option>
              ))}
            </Select>
            {currentChapter && (
              <Tag icon={getStatusTag(currentChapter.status).icon}>
                {getStatusTag(currentChapter.status).text}
              </Tag>
            )}
          </Space>
          <Space>
            {currentChapter && (
              <Text type="secondary">
                字数：{currentChapter.wordCount || 0}
                {isDirty && <Text type="warning"> (未保存)</Text>}
              </Text>
            )}
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setIsModalOpen(true)}
            >
              新建章节
            </Button>
          </Space>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <div style={{ width: 200, borderRight: '1px solid #f0f0f0', overflow: 'auto', padding: 8 }}>
          {sortedChapters.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="暂无章节"
            />
          ) : (
            sortedChapters.map((chapter) => (
              <Card
                key={chapter.id}
                size="small"
                hoverable
                onClick={() => onChapterSelect(chapter)}
                style={{
                  marginBottom: 8,
                  cursor: 'pointer',
                  borderColor: currentChapter?.id === chapter.id ? '#1890ff' : undefined,
                }}
                bodyStyle={{ padding: 12 }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <Text strong style={{ fontSize: 13 }}>
                      第{chapter.number}章
                    </Text>
                    <div style={{ marginTop: 4 }}>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {chapter.title || '无标题'}
                      </Text>
                    </div>
                    <div style={{ marginTop: 4 }}>
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        {chapter.wordCount || 0} 字
                      </Text>
                    </div>
                  </div>
                  <Button
                    type="text"
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteChapter(chapter);
                    }}
                  />
                </div>
              </Card>
            ))
          )}
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {currentChapter ? (
            <>
              <div style={{ padding: '8px 16px', borderBottom: '1px solid #f0f0f0' }}>
                <Title level={5} style={{ margin: 0 }}>
                  {currentChapter.title || `第${currentChapter.number}章`}
                </Title>
              </div>
              <TextArea
                value={content}
                onChange={(e) => handleContentChange(e.target.value)}
                placeholder="开始创作..."
                style={{
                  flex: 1,
                  fontFamily: '"Songti SC", "SimSun", "STSong", serif',
                  fontSize: 16,
                  lineHeight: 1.8,
                  padding: 16,
                  border: 'none',
                  resize: 'none',
                }}
              />
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Empty
                description="请选择或创建一个章节"
              >
                <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsModalOpen(true)}>
                  新建章节
                </Button>
              </Empty>
            </div>
          )}
        </div>
      </div>

      <Modal
        title="新建章节"
        open={isModalOpen}
        onOk={handleAddChapter}
        onCancel={() => {
          setIsModalOpen(false);
          setNewChapterTitle('');
        }}
        okText="创建"
        cancelText="取消"
      >
        <Form layout="vertical">
          <Form.Item
            label="章节标题"
            required
            help={`将是第 ${chapters.length + 1} 章`}
          >
            <Input
              placeholder="请输入章节标题"
              value={newChapterTitle}
              onChange={(e) => setNewChapterTitle(e.target.value)}
              onPressEnter={handleAddChapter}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ChapterEditor;
